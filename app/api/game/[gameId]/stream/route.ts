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
        } catch (error) {
          // Client disconnected, stop sending
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      };

      // Send initial connection message
      send(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      let lastPlayerCount = game.players.length;

      const pollGameState = async () => {
        try {
          const result = await getGameState(gameIdNum);

          if (isActionSuccess(result)) {
            const currentPlayerCount = result.data.players.length;

            // Only send update if player count changed or if it's the first poll
            if (currentPlayerCount !== lastPlayerCount) {
              send(
                `data: ${JSON.stringify({ type: "update", data: result.data })}\n\n`
              );
              lastPlayerCount = currentPlayerCount;
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
        } catch (error) {
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

