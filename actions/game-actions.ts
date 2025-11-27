"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinGameSchema } from "@/lib/zod-schemas";
import { Prisma } from "@prisma/client";

type CreateGameResult = {
  success?: boolean;
  gameCode?: string;
  gameId?: number;
  error?: string;
};

type JoinGameResult = {
  success?: boolean;
  gameId?: number;
  error?: string;
};

export async function createGame(): Promise<CreateGameResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { error: "You must be logged in to create a game" };
    }

    const userId = parseInt(session.user.id);

    // Generate UUID for game code
    const gameCode = crypto.randomUUID();

    // Create game and player in a transaction
    const game = await prisma.game.create({
      data: {
        gameCode,
        players: {
          create: {
            userId,
            deck: [],
            hand: [],
            discardPile: [],
          },
        },
      },
      include: {
        players: true,
      },
    });

    return { success: true, gameCode, gameId: game.id };
  } catch (error) {
    console.error("[createGame] unexpected error", error);
    return { error: "Could not create game" };
  }
}

export async function joinGame(
  prevState: unknown,
  formData: FormData
): Promise<JoinGameResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { error: "You must be logged in to join a game" };
    }

    const userId = parseInt(session.user.id);

    // Validate form data
    const formDataEntries = Object.fromEntries(formData.entries());
    const validatedData = joinGameSchema.safeParse(formDataEntries);

    if (!validatedData.success) {
      const firstError = validatedData.error.issues[0];
      return { error: firstError?.message ?? "Invalid game code" };
    }

    const { gameCode } = validatedData.data;

    // Find game by code
    const game = await prisma.game.findUnique({
      where: { gameCode },
      include: {
        players: true,
      },
    });

    if (!game) {
      return { error: "Game not found" };
    }

    // Check if user is already a player in this game
    const existingPlayer = game.players.find(
      (player) => player.userId === userId
    );

    if (existingPlayer) {
      return { error: "You are already in this game" };
    }

    // Check if game has space (max 2 players for now)
    if (game.players.length >= 2) {
      return { error: "Game is full" };
    }

    // Create player record
    await prisma.player.create({
      data: {
        userId,
        gameId: game.id,
        deck: [],
        hand: [],
        discardPile: [],
      },
    });

    return { success: true, gameId: game.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { error: "You are already in this game" };
      }
    }
    console.error("[joinGame] unexpected error", error);
    return { error: "Could not join game" };
  }
}

