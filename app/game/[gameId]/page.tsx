import { redirect } from "next/navigation";
import { getGamePageData } from "@/lib/game-action-utils";

type GamePageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { gameId, game } = await getGamePageData(params, {
    status: true,
    players: {
      select: {
        userId: true,
      },
    },
  });

  // Redirect based on game status
  if (game.status === "IN_PROGRESS" || game.status === "COMPLETED") {
    redirect(`/game/${gameId}/play`);
  } else if (game.status === "WAITING") {
    redirect(`/game/${gameId}/waiting`);
  } else {
    redirect("/lobby");
  }
}

