import { redirect } from "next/navigation";
import { getGamePageData } from "@/lib/game-action-utils";
import { WaitingClient } from "./waiting-client";

type WaitingPageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function WaitingPage({ params }: WaitingPageProps) {
  const { gameId, userId, game } = await getGamePageData(params, {
    gameCode: true,
    status: true,
    players: {
      select: {
        id: true,
        userId: true,
        readyToStart: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

  // If game is already in progress, redirect to game route
  if (game.status === "IN_PROGRESS" || game.status === "COMPLETED") {
    redirect(`/game/${gameId}/play`);
  }

  return (
    <main className="flex flex-1 flex-col bg-white overflow-hidden items-center justify-center p-4">
      <WaitingClient
        gameId={gameId}
        gameCode={game.gameCode}
        status={game.status}
        players={game.players.map((p) => ({
          id: p.id,
          userId: p.userId,
          readyToStart: p.readyToStart,
          user: {
            id: p.user.id,
            username: p.user.username,
          },
        }))}
        currentUserId={userId}
      />
    </main>
  );
}
