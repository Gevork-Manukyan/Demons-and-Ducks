"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  ActionResult,
  actionSuccess,
  actionError,
} from "@/lib/errors";
import { ERROR_CODES } from "@/lib/error-codes";
import type { Player, Game } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type GamePlayerData = {
  game: Game & { players: Player[] };
  player: Player;
  userId: number;
};

/**
 * Helper function to authenticate user and get game/player data
 * Returns an error ActionResult if validation fails, otherwise returns the data
 */
export async function getGameAndPlayer(
  gameId: number,
  authErrorMessage: string = "You must be logged in"
): Promise<ActionResult<GamePlayerData>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return actionError(authErrorMessage, ERROR_CODES.AUTH_REQUIRED);
  }

  const userId = parseInt(session.user.id);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: true,
    },
  });

  if (!game) {
    return actionError("Game not found", ERROR_CODES.NOT_FOUND);
  }

  const player = game.players.find((p) => p.userId === userId);

  if (!player) {
    return actionError(
      "You are not a player in this game",
      ERROR_CODES.AUTH_REQUIRED
    );
  }

  return actionSuccess({ game, player, userId });
}

/**
 * Helper function for page components to validate params, session, and fetch game data
 * Redirects to /lobby on any validation failure
 * Returns typed game data with the specified select fields
 * 
 * Note: The select must include players with at least userId field
 */
export async function getGamePageData<T extends Prisma.GameSelect>(
  params: Promise<{ gameId: string }>,
  select: T
): Promise<{
  gameId: number;
  userId: number;
  game: Prisma.GameGetPayload<{ select: T }>;
}> {
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
    select,
  });

  if (!game) {
    redirect("/lobby");
  }

  const userId = parseInt(session.user.id);
  
  const gameWithPlayers = game as Prisma.GameGetPayload<{ select: T }> & {
    players: Array<{ userId: number }>;
  };
  
  const player = gameWithPlayers.players.find((p) => p.userId === userId);

  if (!player) {
    redirect("/lobby");
  }

  return {
    gameId: gameIdNum,
    userId,
    game: game as Prisma.GameGetPayload<{ select: T }>,
  };
}
