import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGameState } from "@/actions/game-actions";
import { isActionSuccess } from "@/lib/errors";

type RouteParams = {
  params: Promise<{ gameId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { gameId } = await params;
  const gameIdNum = parseInt(gameId);

  if (isNaN(gameIdNum)) {
    return new Response("Invalid game ID", { status: 400 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = parseInt(session.user.id);

  // Verify user is a player in this game
  const game = await prisma.game.findUnique({
    where: { id: gameIdNum },
    include: {
      players: true,
    },
  });

  if (!game) {
    return new Response("Game not found", { status: 404 });
  }

  const player = game.players.find((p) => p.userId === userId);

  if (!player) {
    return new Response("Forbidden", { status: 403 });
  }

  // Set up SSE headers
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

      let lastState: {
        playerCount: number;
        status: string;
        readyStatuses: Record<number, boolean>;
      } | null = null;

      const pollGameState = async () => {
        try {
          const result = await getGameState(gameIdNum);

          if (isActionSuccess(result)) {
            const data = result.data as unknown as {
              gameCode: string;
              status: string;
              players: Array<{
                id: number;
                userId: number;
                readyToStart: boolean;
                user: {
                  id: number;
                  username: string;
                };
              }>;
            };
            const currentPlayerCount = data.players.length;
            const currentStatus = data.status;
            const currentReadyStatuses: Record<number, boolean> = {};
            data.players.forEach((p) => {
              currentReadyStatuses[p.id] = p.readyToStart;
            });

            // Check if anything changed
            let hasChanged = false;
            if (!lastState) {
              // First poll, always send update
              hasChanged = true;
            } else {
              // Check for changes
              if (
                currentPlayerCount !== lastState.playerCount ||
                currentStatus !== lastState.status
              ) {
                hasChanged = true;
              } else {
                // Check if any ready status changed
                for (const playerId in currentReadyStatuses) {
                  if (
                    currentReadyStatuses[playerId] !==
                    lastState.readyStatuses[playerId]
                  ) {
                    hasChanged = true;
                    break;
                  }
                }
              }
            }

            if (hasChanged) {
              send(
                `data: ${JSON.stringify({ type: "update", data })}\n\n`
              );
              lastState = {
                playerCount: currentPlayerCount,
                status: currentStatus,
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
      };

      // Poll immediately, then every 1.5 seconds
      await pollGameState();
      intervalId = setInterval(pollGameState, 1500);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        try {
          controller.close();
        } catch {
          // Ignore errors when closing
        }
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

