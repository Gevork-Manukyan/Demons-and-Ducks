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
import { parseCardIdArray, safeParseCardGrid } from "@/lib/zod-schemas";
import { convertPrismaCardToCardType } from "@/lib/card-utils";
import type { Card } from "@/lib/card-types";
import {
  databaseFormatToGrid,
  gridToDatabaseFormat,
  getValidPlacementPositions,
  placeCard as placeCardOnGrid,
  updateCardHypnotized,
  createEmptyGrid,
  updateGridValidPositions,
  type GameGrid,
  type DatabaseGridFormat,
} from "@/lib/game-field-utils";
import type { Player, Game } from "@prisma/client";

type GamePlayerData = {
  game: Game & { players: Player[] };
  player: Player;
  userId: number;
};

/**
 * Helper function to authenticate user and get game/player data
 * Returns an error ActionResult if validation fails, otherwise returns the data
 */
async function getGameAndPlayer(
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
  gridData: DatabaseGridFormat;
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

    const gridData = safeParseCardGrid(game.cardGrid) ?? null;

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
      gridData,
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

export async function getPlayerHandCardIds(
  gameId: number
): Promise<ActionResult<number[]>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to view your hand"
    );

    if (result.error) {
      return result;
    }

    const { player } = result.data;
    const handCardIds = parseCardIdArray(player.hand);

    return actionSuccess(handCardIds);
  } catch (error) {
    console.error("[getPlayerHandCardIds] unexpected error", error);
    return actionError("Could not fetch player hand card IDs", ERROR_CODES.UNKNOWN_ERROR);
  }
}

export async function findCardIdInHand(
  gameId: number,
  cardName: string,
  cardDeck: string,
  cardType: string,
  isBasic?: boolean
): Promise<ActionResult<number | null>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to find a card in your hand"
    );

    if (result.error) {
      return result;
    }

    const { player } = result.data;
    const handCardIds = parseCardIdArray(player.hand);

    if (handCardIds.length === 0) {
      return actionSuccess(null);
    }

    const cardRecords = await prisma.card.findMany({
      where: { id: { in: handCardIds } },
    });

    const matchingCard = cardRecords.find(
      (dbCard) =>
        dbCard.name === cardName &&
        dbCard.deck === cardDeck &&
        dbCard.type === cardType &&
        (cardType !== "creature" || dbCard.isBasic === isBasic)
    );

    return actionSuccess(matchingCard?.id ?? null);
  } catch (error) {
    console.error("[findCardIdInHand] unexpected error", error);
    return actionError("Could not find card in hand", ERROR_CODES.UNKNOWN_ERROR);
  }
}

export async function getPlayerHand(
  gameId: number
): Promise<ActionResult<Card[]>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to view your hand"
    );

    if (result.error) {
      return result;
    }

    const { player } = result.data;
    const handCardIds = parseCardIdArray(player.hand);

    if (handCardIds.length === 0) {
      return actionSuccess([]);
    }

    const cardRecords = await prisma.card.findMany({
      where: { id: { in: handCardIds } },
    });

    const hand = cardRecords.map(convertPrismaCardToCardType);

    return actionSuccess(hand);
  } catch (error) {
    console.error("[getPlayerHand] unexpected error", error);
    return actionError("Could not fetch player hand", ERROR_CODES.UNKNOWN_ERROR);
  }
}

export async function getOpponentHandCount(
  gameId: number
): Promise<ActionResult<number>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to view opponent hand count"
    );

    if (result.error) {
      return result;
    }

    const { game, userId } = result.data;
    const opponent = game.players.find((p) => p.userId !== userId);
    const opponentHandCount = opponent
      ? parseCardIdArray(opponent.hand).length
      : 0;

    return actionSuccess(opponentHandCount);
  } catch (error) {
    console.error("[getOpponentHandCount] unexpected error", error);
    return actionError(
      "Could not fetch opponent hand count",
      ERROR_CODES.UNKNOWN_ERROR
    );
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

    const gridData = safeParseCardGrid(updatedGame.cardGrid) ?? null;

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
      gridData,
    });
  } catch (error) {
    console.error("[markPlayerReady] unexpected error", error);
    return actionError(
      "Could not update ready status",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Helper function to create a cardId to Card map from grid data
 * Optionally includes additional card IDs (e.g., for a card being placed)
 */
export async function createCardIdToCardMap(
  gridData: Array<{ cardId: number; row: number; col: number; hypnotized: boolean }>,
  additionalCardIds: number[] = []
): Promise<Map<number, Card>> {
  const gridCardIds = gridData.map((entry) => entry.cardId);
  const allCardIds = [...new Set([...gridCardIds, ...additionalCardIds])];

  const cardRecords = await prisma.card.findMany({
    where: { id: { in: allCardIds } },
  });

  const cardIdToCardMap = new Map<number, Card>();
  for (const cardRecord of cardRecords) {
    const card = convertPrismaCardToCardType(cardRecord);
    cardIdToCardMap.set(cardRecord.id, card);
  }

  return cardIdToCardMap;
}

/**
 * Helper function to collect all cards from a GameGrid
 */
function collectCardsFromGrid(grid: GameGrid): Card[] {
  const cards: Card[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].card !== null) {
        cards.push(grid[r][c].card!);
      }
    }
  }
  return cards;
}

/**
 * Helper function to convert a GameGrid to database format
 * Handles card ID mapping and conversion
 */
async function gridToDatabaseFormatWithMapping(
  grid: GameGrid
): Promise<DatabaseGridFormat> {
  const allCardsInGrid = collectCardsFromGrid(grid);
  const cardToIdMap = await createCardToIdMap(allCardsInGrid);
  return gridToDatabaseFormat(grid, (card) => cardToIdMap.get(card)!);
}

/**
 * Helper function to create a map from Card to cardId by matching properties
 */
async function createCardToIdMap(
  cards: Card[]
): Promise<Map<Card, number>> {
  const cardMap = new Map<Card, number>();

  const allCards = await prisma.card.findMany();

  for (const card of cards) {
    const matchingCard = allCards.find(
      (dbCard) =>
        dbCard.name === card.name &&
        dbCard.deck === card.deck &&
        dbCard.type === card.type &&
        (card.type !== "creature" || dbCard.isBasic === card.isBasic)
    );

    if (matchingCard) {
      cardMap.set(card, matchingCard.id);
    }
  }

  return cardMap;
}

export async function placeCardOnField(
  gameId: number,
  cardId: number,
  row: number,
  col: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to place a card"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Verify the card is in the player's hand
    const handCardIds = parseCardIdArray(player.hand);
    if (!handCardIds.includes(cardId)) {
      return actionError(
        "Card is not in your hand",
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate position
    if (row < 0 || row >= 5 || col < 0 || col >= 5) {
      return actionError(
        "Invalid position",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Load current grid from database
    const gridData = safeParseCardGrid(game.cardGrid);
    let currentGrid: GameGrid;

    if (gridData && gridData.length > 0) {
      const cardIdToCardMap = await createCardIdToCardMap(gridData, [cardId]);
      currentGrid = databaseFormatToGrid(gridData, cardIdToCardMap);
    } else {
      currentGrid = updateGridValidPositions(createEmptyGrid());
    }

    const validPositions = getValidPlacementPositions(currentGrid);
    const isValidPosition = validPositions.some(
      (pos) => pos.row === row && pos.col === col
    );

    if (!isValidPosition) {
      return actionError(
        "Invalid placement position",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const cardRecord = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!cardRecord) {
      return actionError("Card not found", ERROR_CODES.NOT_FOUND);
    }

    if (cardRecord.type !== "creature") {
      return actionError(
        "Only creature cards can be placed on the field",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const cardToPlace = convertPrismaCardToCardType(cardRecord);

    const updatedGrid = placeCardOnGrid(
      currentGrid,
      { row, col },
      cardToPlace
    );

    const updatedGridData = await gridToDatabaseFormatWithMapping(updatedGrid);
    const updatedHand = handCardIds.filter((id) => id !== cardId);

    // Update game and player in a transaction
    await prisma.$transaction([
      prisma.game.update({
        where: { id: gameId },
        data: { cardGrid: updatedGridData === null ? undefined : updatedGridData },
      }),
      prisma.player.update({
        where: { id: player.id },
        data: { hand: updatedHand },
      }),
    ]);

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[placeCardOnField] unexpected error", error);
    return actionError(
      "Could not place card on field",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

export async function updateCardHypnotizedState(
  gameId: number,
  row: number,
  col: number,
  hypnotized: boolean
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to update card state"
    );

    if (result.error) {
      return result;
    }

    const { game } = result.data;

    // Validate position
    if (row < 0 || row >= 5 || col < 0 || col >= 5) {
      return actionError(
        "Invalid position",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Load current grid from database
    const gridData = safeParseCardGrid(game.cardGrid);

    if (!gridData || gridData.length === 0) {
      return actionError(
        "No cards on the field",
        ERROR_CODES.NOT_FOUND
      );
    }

    const cardIdToCardMap = await createCardIdToCardMap(gridData);
    const currentGrid = databaseFormatToGrid(gridData, cardIdToCardMap);

    // Check if there's a card at the position
    if (currentGrid[row][col].card === null) {
      return actionError(
        "No card at the specified position",
        ERROR_CODES.NOT_FOUND
      );
    }

    // Update hypnotized state
    const updatedGrid = updateCardHypnotized(
      currentGrid,
      { row, col },
      hypnotized
    );

    const updatedGridData = await gridToDatabaseFormatWithMapping(updatedGrid);

    // Update game
    await prisma.game.update({
      where: { id: gameId },
      data: { cardGrid: updatedGridData === null ? undefined : updatedGridData },
    });

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[updateCardHypnotizedState] unexpected error", error);
    return actionError(
      "Could not update card hypnotized state",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

export async function playMagicOrInstantCard(
  gameId: number,
  cardId: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to play a card"
    );

    if (result.error) {
      return result;
    }

    const { player } = result.data;

    const handCardIds = parseCardIdArray(player.hand);
    if (!handCardIds.includes(cardId)) {
      return actionError(
        "Card is not in your hand",
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const cardRecord = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!cardRecord) {
      return actionError("Card not found", ERROR_CODES.NOT_FOUND);
    }

    if (cardRecord.type === "creature") {
      return actionError(
        "Only magic and instant cards can be played this way",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const updatedHand = handCardIds.filter((id) => id !== cardId);
    const discardCardIds = parseCardIdArray(player.discardPile);
    const updatedDiscardPile = [...discardCardIds, cardId];

    await prisma.player.update({
      where: { id: player.id },
      data: {
        hand: updatedHand,
        discardPile: updatedDiscardPile,
      },
    });

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[playMagicOrInstantCard] unexpected error", error);
    return actionError(
      "Could not play card",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

