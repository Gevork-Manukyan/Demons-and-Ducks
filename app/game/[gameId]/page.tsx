import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { GameClient } from "./game-client";
import { calculateOpponentHandCount, convertCardRecordsToHand } from "@/lib/card-utils";
import { parseCardIdArray, safeParseCardGrid } from "@/lib/zod-schemas";
import { databaseFormatToGrid } from "@/lib/game-field-utils";
import { createCardIdToCardMap } from "@/actions/game-actions";
import type { Card } from "@/lib/card-types";
import type { GameGrid } from "@/lib/game-field-utils";

type GamePageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const gameIdNum = parseInt(gameId);

  if (isNaN(gameIdNum)) {
    redirect("/lobby");
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/lobby");
  }

  const game = await prisma.game.findUnique({
    where: { id: gameIdNum },
    select: {
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
    },
  });

  if (!game) {
    redirect("/lobby");
  }

  const userId = parseInt(session.user.id);
  const player = game.players.find((p) => p.userId === userId);

  if (!player) {
    redirect("/lobby");
  }

  const handCardIds = parseCardIdArray(player.hand);
  
  // Fetch Card records for the hand
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
    <div className="flex h-screen flex-col">
      {/* Minimal Header */}
      <nav className="flex items-center justify-between bg-white px-6 py-4">
        <Link href="/lobby" className="text-xl font-semibold text-zinc-900 hover:text-zinc-700 transition-colors">
          Demons and Ducks
        </Link>
        <SignOutButton />
      </nav>

      {/* Main content - full height */}
      <main className="flex flex-1 flex-col bg-white overflow-hidden">
        <GameClient
          gameId={gameIdNum}
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
    </div>
  );
}

