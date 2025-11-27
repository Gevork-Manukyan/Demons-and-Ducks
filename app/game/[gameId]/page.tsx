import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
              name: true,
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
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Game Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-zinc-600">Game Code: {game.gameCode}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Players:</p>
              <ul className="space-y-1">
                {game.players.map((p) => (
                  <li key={p.id} className="text-sm text-zinc-700">
                    {p.user.username}
                    {p.userId === userId && " (You)"}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm text-zinc-600">
                Points to Win: {game.pointsToWin}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-600">
                Your Current Points: {player.currentPoints}
              </p>
            </div>
            <div className="pt-4">
              <p className="text-sm text-zinc-500 italic">
                Game UI will be implemented here
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

