import { NextRequest } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGameState } from "@/actions/game-actions";
import { actionError, actionSuccess, isActionError, isActionSuccess } from "@/lib/errors";
import { ERROR_CODES } from "@/lib/error-codes";

type RouteParams = {
  params: Promise<{ gameId: string }>;
};

type LastState = {
  playerCount: number;
  status: string;
  readyStatuses: Record<number, boolean>;
  gridData: string | null;
  opponentHandCount: number;
  currentPhase: string;
  currentTurnPlayerId: number | null;
  playerScores: string;
  playerHand: string;
  playerDeck: string;
  playerDiscardPile: string;
  playerCurrentPoints: number;
  summonUsedThisTurn: boolean;
  creatureCardPlayedThisTurn: boolean;
  magicCardsPlayedThisTurn: number;
};

type GameStateFields = Omit<LastState, "readyStatuses">;

async function getGameAndPlayer(gameId: string, session: Session | null) {
  const gameIdNum = parseInt(gameId);

  if (isNaN(gameIdNum)) {
    return actionError("Invalid game ID", ERROR_CODES.VALIDATION_ERROR);
  }

  if (!session?.user?.id) {
    return actionError("You must be logged in to stream game state", ERROR_CODES.AUTH_REQUIRED);
  }

  const userId = parseInt(session.user.id);

  const game = await prisma.game.findUnique({
    where: { id: gameIdNum },
    include: {
      players: true,
    },
  });

  if (!game) {
    return actionError("Game not found", ERROR_CODES.NOT_FOUND);
  }

  const player = game.players.find((p) => p.userId === userId);

  if (!player) {
    return actionError("You are not a player in this game", ERROR_CODES.AUTH_REQUIRED);
  }

  return actionSuccess({ game, player, userId, gameIdNum });
}

function hasGameStateFieldsChanged(
  current: GameStateFields,
  lastState: LastState
): boolean {
  return (
    current.playerCount !== lastState.playerCount ||
    current.status !== lastState.status ||
    current.gridData !== lastState.gridData ||
    current.opponentHandCount !== lastState.opponentHandCount ||
    current.currentPhase !== lastState.currentPhase ||
    current.currentTurnPlayerId !== lastState.currentTurnPlayerId ||
    current.playerScores !== lastState.playerScores ||
    current.playerHand !== lastState.playerHand ||
    current.playerDeck !== lastState.playerDeck ||
    current.playerDiscardPile !== lastState.playerDiscardPile ||
    current.playerCurrentPoints !== lastState.playerCurrentPoints ||
    current.summonUsedThisTurn !== lastState.summonUsedThisTurn ||
    current.creatureCardPlayedThisTurn !== lastState.creatureCardPlayedThisTurn ||
    current.magicCardsPlayedThisTurn !== lastState.magicCardsPlayedThisTurn
  );
}

function hasReadyStatusesChanged(
  current: Record<number, boolean>,
  last: Record<number, boolean>
): boolean {
  for (const playerId in current) {
    if (current[playerId] !== last[playerId]) {
      return true;
    }
  }
  return false;
}

function hasStateChanged(
  currentState: GameStateFields,
  currentReadyStatuses: Record<number, boolean>,
  lastState: LastState | null
): boolean {
  // First poll, always send update
  if (!lastState) return true;

  if (hasGameStateFieldsChanged(currentState, lastState)) return true;

  if (currentState.status === "WAITING") {
    if (hasReadyStatusesChanged(currentReadyStatuses, lastState.readyStatuses)) return true;
  }

  return false;
}

async function pollGameState(
  gameIdNum: number,
  userId: number,
  send: (data: string) => void,
  lastState: { value: LastState | null }
) {
  try {
    const result = await getGameState(gameIdNum);

    if (isActionSuccess(result)) {
      const data = result.data;
      const currentPlayerCount = data.players.length;
      const currentStatus = data.status;
      const currentReadyStatuses: Record<number, boolean> = {};
      data.players.forEach((p) => { currentReadyStatuses[p.id] = p.readyToStart; });

      const currentGridData          = data.gridData ? JSON.stringify(data.gridData) : null;
      const currentOpponentHandCount = data.opponentHandCount;
      const currentPhase             = data.currentPhase ?? "DRAW";
      const currentTurnPlayerId      = data.currentTurnPlayerId;
      const currentPlayerScores      = JSON.stringify(data.playerScores ?? []);

      // Fetch current player data to track hand, deck, discardPile, and points
      const currentGame = await prisma.game.findUnique({
        where: { id: gameIdNum },
        include: {
          players: {
            where: { userId: userId },
          },
        },
      });

      const currentPlayer = currentGame?.players.find((p) => p.userId === userId);
      const currentPlayerHand = currentPlayer ? JSON.stringify(currentPlayer.hand) : "";
      const currentPlayerDeck = currentPlayer ? JSON.stringify(currentPlayer.deck) : "";
      const currentPlayerDiscardPile = currentPlayer ? JSON.stringify(currentPlayer.discardPile) : "";
      const currentPlayerCurrentPoints = currentPlayer?.currentPoints ?? 0;
      const currentSummonUsedThisTurn = data.summonUsedThisTurn ?? false;
      const currentCreatureCardPlayedThisTurn = data.creatureCardPlayedThisTurn ?? false;
      const currentMagicCardsPlayedThisTurn = data.magicCardsPlayedThisTurn ?? 0;

      const currentState: GameStateFields = {
        playerCount: currentPlayerCount,
        status: currentStatus,
        gridData: currentGridData,
        opponentHandCount: currentOpponentHandCount,
        currentPhase: currentPhase,
        currentTurnPlayerId: currentTurnPlayerId,
        playerScores: currentPlayerScores,
        playerHand: currentPlayerHand,
        playerDeck: currentPlayerDeck,
        playerDiscardPile: currentPlayerDiscardPile,
        playerCurrentPoints: currentPlayerCurrentPoints,
        summonUsedThisTurn: currentSummonUsedThisTurn,
        creatureCardPlayedThisTurn: currentCreatureCardPlayedThisTurn,
        magicCardsPlayedThisTurn: currentMagicCardsPlayedThisTurn,
      };

      if (hasStateChanged(currentState, currentReadyStatuses, lastState.value)) {
        send(`data: ${JSON.stringify({ type: "update", data })}\n\n`);
        lastState.value = {
          ...currentState,
          readyStatuses: currentReadyStatuses,
        };
      } else {
        // Send heartbeat to keep connection alive
        send(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
      }
    }
  } catch (error) {
    console.error("[SSE] Error polling game state:", error);
    send(
      `data: ${JSON.stringify({ type: "error", message: "Failed to fetch game state" })}\n\n`
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { gameId } = await params;
  const session = await getServerSession(authOptions);
  const result = await getGameAndPlayer(gameId, session);
  if (isActionError(result)) {
    return new Response(result.message, { status: 400 });
  }

  const { userId, gameIdNum } = result.data;
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Client disconnected, stop sending
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      };

      // Send initial connection message
      send(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      const lastState = { value: null as LastState | null };

      // Poll immediately, then every 1.5 seconds
      await pollGameState(gameIdNum, userId, send, lastState);
      intervalId = setInterval(() => pollGameState(gameIdNum, userId, send, lastState), 1500);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      // Cleanup when stream is cancelled
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

