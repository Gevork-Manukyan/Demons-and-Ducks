import { redirect } from "next/navigation";
import { getGamePageData } from "@/lib/game-action-utils";
import { GameplayClient } from "./gameplay-client";
import { calculateOpponentHandCount, convertCardRecordsToHand } from "@/lib/card-utils";
import { parseCardIdArray, safeParseCardGrid } from "@/lib/zod-schemas";
import { databaseFormatToGrid } from "@/lib/game-field-utils";
import { createCardIdToCardMap } from "@/actions/game-actions";
import { prisma } from "@/lib/prisma";
import type { Card } from "@/lib/card-types";
import type { GameGrid } from "@/lib/game-field-utils";

type GameplayPageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GameplayPage({ params }: GameplayPageProps) {
  const { gameId, userId, game } = await getGamePageData(params, {
    gameCode: true,
    status: true,
    currentPhase: true,
    currentTurnPlayerId: true,
    cardGrid: true,
    creatureCardPlayedThisTurn: true,
    magicCardsPlayedThisTurn: true,
    summonUsedThisTurn: true,
    players: {
      select: {
        id: true,
        userId: true,
        readyToStart: true,
        currentPoints: true,
        hand: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

  // If game is not in progress, redirect to waiting room
  if (game.status !== "IN_PROGRESS" && game.status !== "COMPLETED") {
    redirect(`/game/${gameId}/waiting`);
  }

  // Fetch Card records for the hand
  const player = game.players.find((p) => p.userId === userId)!;
  const handCardIds = parseCardIdArray(player.hand);
  
  let initialHand: Card[] = [];
  if (handCardIds.length > 0) {
    const cardRecords = await prisma.card.findMany({
      where: { id: { in: handCardIds } },
    });
    
    initialHand = convertCardRecordsToHand(cardRecords, handCardIds);
  }

  const opponentHandCount = calculateOpponentHandCount(game.players, userId);

  // Load grid from database
  let initialGrid: GameGrid | undefined = undefined;
  const gridData = safeParseCardGrid(game.cardGrid) ?? null;
  
  if (gridData && gridData.length > 0) {
    const cardIdToCardMap = await createCardIdToCardMap(gridData);
    initialGrid = databaseFormatToGrid(gridData, cardIdToCardMap);
  }

  return (
    <main className="flex flex-1 flex-col bg-white overflow-hidden">
      <GameplayClient
        gameId={gameId}
        initialGameState={{
          gameCode: game.gameCode,
          status: game.status,
          players: game.players.map((p) => ({
            id: p.id,
            userId: p.userId,
            readyToStart: p.readyToStart,
            user: {
              id: p.user.id,
              username: p.user.username,
            },
          })),
          gridData,
          opponentHandCount,
          currentPhase: game.currentPhase || "DRAW",
          currentTurnPlayerId: game.currentTurnPlayerId,
          playerScores: game.players.map((p) => ({
            playerId: p.id,
            points: p.currentPoints,
          })),
          creatureCardPlayedThisTurn: game.creatureCardPlayedThisTurn,
          magicCardsPlayedThisTurn: game.magicCardsPlayedThisTurn,
          summonUsedThisTurn: game.summonUsedThisTurn,
        }}
        currentUserId={userId}
        initialHand={initialHand}
        initialOpponentHandCount={opponentHandCount}
        initialGrid={initialGrid}
      />
    </main>
  );
}
