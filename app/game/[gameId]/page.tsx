import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { GameClient } from "./game-client";

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

  const userId = parseInt(session.user.id);

  // Verify user is a player in this game
  const game = await prisma.game.findUnique({
    where: { id: gameIdNum },
    include: {
      players: {
        include: {
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

  const player = game.players.find((p) => p.userId === userId);

  if (!player) {
    redirect("/lobby");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-900">Demons and Ducks</h1>
        <SignOutButton />
      </nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-6 py-16">
        <GameClient
          gameId={gameIdNum}
          initialGameState={{
            gameCode: game.gameCode,
            players: game.players.map((p) => ({
              id: p.id,
              userId: p.userId,
              user: {
                id: p.user.id,
                username: p.user.username,
              },
            })),
          }}
          currentUserId={userId}
        />
      </main>
    </div>
  );
}

