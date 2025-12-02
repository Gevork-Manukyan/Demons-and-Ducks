"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinGameSchema } from "@/lib/zod-schemas";
import { Prisma } from "@prisma/client";
import {
  ActionResult,
  actionSuccess,
  actionError,
} from "@/lib/errors";
import { ERROR_CODES } from "@/lib/error-codes";
import { initializeGame } from "@/lib/game-initialization";

type CreateGameData = {
  gameCode: string;
  gameId: number;
};

type JoinGameData = {
  gameId: number;
};

export async function createGame(): Promise<ActionResult<CreateGameData>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return actionError(
        "You must be logged in to create a game",
        ERROR_CODES.AUTH_REQUIRED
      );
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

    return actionSuccess({
      gameCode,
      gameId: game.id,
    });
  } catch (error) {
    console.error("[createGame] unexpected error", error);
    return actionError(
      "Could not create game",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

export type GameState = {
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

export async function getGameState(
  gameId: number
): Promise<ActionResult<GameState>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return actionError(
        "You must be logged in to view game state",
        ERROR_CODES.AUTH_REQUIRED
      );
    }

    const userId = parseInt(session.user.id);

    const game = await prisma.game.findUnique({
      where: { id: gameId },
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
      return actionError("Game not found", ERROR_CODES.NOT_FOUND);
    }

    const player = game.players.find((p) => p.userId === userId);

    if (!player) {
      return actionError(
        "You are not a player in this game",
        ERROR_CODES.AUTH_REQUIRED
      );
    }

    return actionSuccess({
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
    });
  } catch (error) {
    console.error("[getGameState] unexpected error", error);
    return actionError("Could not fetch game state", ERROR_CODES.UNKNOWN_ERROR);
  }
}

export async function joinGame(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<JoinGameData>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return actionError(
        "You must be logged in to join a game",
        ERROR_CODES.AUTH_REQUIRED
      );
    }

    const userId = parseInt(session.user.id);

    // Validate form data
    const formDataEntries = Object.fromEntries(formData.entries());
    const validatedData = joinGameSchema.safeParse(formDataEntries);

    if (!validatedData.success) {
      const firstError = validatedData.error.issues[0];
      return actionError(
        firstError?.message ?? "Invalid game code",
        ERROR_CODES.VALIDATION_ERROR,
        firstError?.path?.[0]?.toString()
      );
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
      return actionError("Game not found", ERROR_CODES.NOT_FOUND);
    }

    // Check if user is already a player in this game
    const existingPlayer = game.players.find(
      (player) => player.userId === userId
    );

    if (existingPlayer) {
      return actionError(
        "You are already in this game",
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    // Check if game has space (max 2 players for now)
    if (game.players.length >= 2) {
      return actionError("Game is full", ERROR_CODES.GAME_FULL);
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

    return actionSuccess({ gameId: game.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return actionError(
          "You are already in this game",
          ERROR_CODES.ALREADY_EXISTS
        );
      }
    }
    console.error("[joinGame] unexpected error", error);
    return actionError("Could not join game", ERROR_CODES.UNKNOWN_ERROR);
  }
}

export async function markPlayerReady(
  gameId: number,
  ready: boolean
): Promise<ActionResult<GameState>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return actionError(
        "You must be logged in to mark ready status",
        ERROR_CODES.AUTH_REQUIRED
      );
    }

    const userId = parseInt(session.user.id);

    // Verify user is a player in this game
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

    // Check if game has already started
    if (game.status === "IN_PROGRESS") {
      return actionError("Game has already started", ERROR_CODES.UNAUTHORIZED);
    }

    // Update player's ready status
    await prisma.player.update({
      where: { id: player.id },
      data: { readyToStart: ready },
    });

    // Check if all players are ready
    const updatedGame = await prisma.game.findUnique({
      where: { id: gameId },
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

    if (!updatedGame) {
      return actionError("Game not found", ERROR_CODES.NOT_FOUND);
    }

    const allPlayersReady =
      updatedGame.players.length >= 2 &&
      updatedGame.players.every((p) => p.readyToStart);

    // If all players are ready, initialize the game and update status
    if (allPlayersReady && updatedGame.status === "WAITING") {
      // Initialize game: assign decks, shuffle, draw cards, select first player
      await initializeGame(gameId);
      
      await prisma.game.update({
        where: { id: gameId },
        data: { status: "IN_PROGRESS" },
      });
      updatedGame.status = "IN_PROGRESS";
    }

    return actionSuccess({
      gameCode: updatedGame.gameCode,
      status: updatedGame.status,
      players: updatedGame.players.map((p) => ({
        id: p.id,
        userId: p.userId,
        readyToStart: p.readyToStart,
        user: {
          id: p.user.id,
          username: p.user.username,
        },
      })),
    });
  } catch (error) {
    console.error("[markPlayerReady] unexpected error", error);
    return actionError(
      "Could not update ready status",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

