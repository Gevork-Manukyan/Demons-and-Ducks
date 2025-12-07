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
import { convertPrismaCardToCardType, calculateOpponentHandCount, convertCardRecordsToHand } from "@/lib/card-utils";
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
import {
  isPlayerTurn,
  getCurrentPhase,
  getOtherPlayer,
  canPerformAction,
  type GamePhase,
} from "@/lib/turn-validation";
import {
  detectThreeInARow,
  isValidThreeInARow,
  createPlayerIdMap,
} from "@/lib/scoring-utils";
import type { Player, Game } from "@prisma/client";

type GamePlayerData = {
  game: Game & { players: Player[] };
  player: Player;
  userId: number;
};

type GameWithPlayers = Game & { players: Player[] };

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
  opponentHandCount: number;
  currentPhase: string;
  currentTurnPlayerId: number | null;
  playerScores: Array<{ playerId: number; points: number }>;
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

    const opponentHandCount = calculateOpponentHandCount(game.players, userId);
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
      opponentHandCount,
      currentPhase: game.currentPhase,
      currentTurnPlayerId: game.currentTurnPlayerId,
      playerScores: game.players.map((p) => ({
        playerId: p.id,
        points: p.currentPoints,
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

    const hand = convertCardRecordsToHand(cardRecords, handCardIds);

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
    const opponentHandCount = calculateOpponentHandCount(game.players, userId);

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
    const opponentHandCount = calculateOpponentHandCount(updatedGame.players, userId);

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
      opponentHandCount,
      currentPhase: updatedGame.currentPhase,
      currentTurnPlayerId: updatedGame.currentTurnPlayerId,
      playerScores: updatedGame.players.map((p) => ({
        playerId: p.id,
        points: p.currentPoints,
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

/**
 * Helper function to create a cardId to Card map from grid data
 * Optionally includes additional card IDs (e.g., for a card being placed)
 */
export async function createCardIdToCardMap(
  gridData: Array<{ cardId: number; row: number; col: number; hypnotized: boolean; playerId?: number }>,
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

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only place cards in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

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
      cardToPlace,
      player.id
    );

    // Convert to database format
    const updatedGridData = gridToDatabaseFormat(
      updatedGrid,
      (card) => card.id
    );
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

    // If no magic cards played, allow ending phase
    // If 1 magic card played, only allow another magic card or ending phase
    // If 2 magic cards played, auto-advance to SCORING
    // For creature placement, check if we should auto-advance
    if (game.magicCardsPlayedThisTurn === 0) {
      // Can continue playing or end phase
      return actionSuccess(undefined);
    } else if (game.magicCardsPlayedThisTurn >= 2) {
      // Auto-advance to SCORING
      const refetchResult = await refetchGameAndPlayer(gameId, player.id);
      if (refetchResult.error) {
        return refetchResult;
      }
      return await advanceToNextPhaseInternal(refetchResult.data.game, refetchResult.data.player);
    }

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

    const updatedGridData = gridToDatabaseFormat(
      updatedGrid,
      (card) => card.id
    );

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

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only play cards in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Check magic card limit
    if (game.magicCardsPlayedThisTurn >= 2) {
      return actionError(
        "Maximum of 2 magic/instant cards per turn",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

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

    const newMagicCardsPlayed = game.magicCardsPlayedThisTurn + 1;

    // Update player and game in transaction
    await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: {
          hand: updatedHand,
          discardPile: updatedDiscardPile,
        },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          magicCardsPlayedThisTurn: newMagicCardsPlayed,
        },
      }),
    ]);

    // If 2 magic cards played, auto-advance to SCORING
    if (newMagicCardsPlayed >= 2) {
      const refetchResult = await refetchGameAndPlayer(gameId, player.id);
      if (refetchResult.error) {
        return refetchResult;
      }
      return await advanceToNextPhaseInternal(refetchResult.data.game, refetchResult.data.player);
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[playMagicOrInstantCard] unexpected error", error);
    return actionError(
      "Could not play card",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Helper function to refetch game and player after database updates
 * Returns an error ActionResult if game or player not found, otherwise returns the updated data
 */
async function refetchGameAndPlayer(
  gameId: number,
  playerId: number
): Promise<ActionResult<{ game: GameWithPlayers; player: Player }>> {
  const updatedGame = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true },
  });

  if (!updatedGame) {
    return actionError("Game not found", ERROR_CODES.NOT_FOUND);
  }

  const updatedPlayer = updatedGame.players.find((p) => p.id === playerId);
  if (!updatedPlayer) {
    return actionError("Player not found", ERROR_CODES.NOT_FOUND);
  }

  return actionSuccess({ game: updatedGame, player: updatedPlayer });
}

/**
 * Helper function to check if AWAKEN phase should be auto-skipped
 */
async function shouldSkipAwakenPhase(
  game: GameWithPlayers,
  player: Player
): Promise<boolean> {
  // Check if player has at least 2 cards in hand
  const handCardIds = parseCardIdArray(player.hand);
  if (handCardIds.length < 2) {
    return true;
  }

  // Check if player has any hypnotized cards
  const gridData = safeParseCardGrid(game.cardGrid);
  if (!gridData || gridData.length === 0) {
    return true;
  }

  // Check if any hypnotized cards belong to this player
  for (const entry of gridData) {
    if (entry.hypnotized && entry.playerId === player.id) {
      return false; // Has hypnotized card, don't skip
    }
  }

  return true; // No hypnotized cards, skip
}

/**
 * Helper function to check if SCORING phase should be auto-skipped
 */
async function shouldSkipScoringPhase(
  game: GameWithPlayers,
  player: Player
): Promise<boolean> {
  const gridData = safeParseCardGrid(game.cardGrid);
  if (!gridData || gridData.length === 0) {
    return true;
  }

  // Convert to grid format
  const cardIdToCardMap = await createCardIdToCardMap(gridData);
  const grid = databaseFormatToGrid(gridData, cardIdToCardMap);
  const playerIdMap = createPlayerIdMap(gridData);

  // Check if player has any three-in-a-rows
  const threeInARows = detectThreeInARow(grid, player.id, playerIdMap);
  return threeInARows.length === 0;
}

/**
 * Helper function to advance to the next phase
 */
async function advanceToNextPhaseInternal(
  game: GameWithPlayers,
  player: Player
): Promise<ActionResult<void>> {
  const currentPhase = getCurrentPhase(game);

  let nextPhase: GamePhase | null = null;

  switch (currentPhase) {
    case "DRAW":
      // Check if AWAKEN should be skipped
      if (await shouldSkipAwakenPhase(game, player)) {
        // Skip AWAKEN, go to ACTION
        nextPhase = "ACTION";
      } else {
        nextPhase = "AWAKEN";
      }
      break;
    case "AWAKEN":
      nextPhase = "ACTION";
      break;
    case "ACTION":
      // Check if SCORING should be skipped
      if (await shouldSkipScoringPhase(game, player)) {
        // Skip SCORING, end turn
        return await endTurnInternal(game, player);
      } else {
        nextPhase = "SCORING";
      }
      break;
    case "SCORING":
      // End turn
      return await endTurnInternal(game, player);
  }

  if (nextPhase) {
    await prisma.game.update({
      where: { id: game.id },
      data: { currentPhase: nextPhase },
    });
  }

  return actionSuccess(undefined);
}

/**
 * Helper function to end the turn
 */
async function endTurnInternal(
  game: GameWithPlayers,
  player: Player
): Promise<ActionResult<void>> {
  // Get the other player
  const otherPlayer = getOtherPlayer(game.players, player.id);
  if (!otherPlayer) {
    return actionError("Other player not found", ERROR_CODES.NOT_FOUND);
  }

  // Check win condition
  if (player.currentPoints >= game.pointsToWin) {
    await prisma.game.update({
      where: { id: game.id },
      data: { status: "COMPLETED" },
    });
    return actionSuccess(undefined);
  }

  // Switch to other player's turn
  await prisma.game.update({
    where: { id: game.id },
    data: {
      currentTurnPlayerId: otherPlayer.id,
      currentPhase: "DRAW",
      hasUsedAwaken: false,
      magicCardsPlayedThisTurn: 0,
    },
  });

  return actionSuccess(undefined);
}

/**
 * Advance to the next phase
 */
export async function advanceToNextPhase(
  gameId: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to advance phase"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn
    if (!isPlayerTurn(game, player.id)) {
      return actionError("It's not your turn", ERROR_CODES.NOT_YOUR_TURN);
    }

    return await advanceToNextPhaseInternal(game, player);
  } catch (error) {
    console.error("[advanceToNextPhase] unexpected error", error);
    return actionError(
      "Could not advance phase",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * End the current turn
 */
export async function endTurn(gameId: number): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to end turn"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn
    if (!isPlayerTurn(game, player.id)) {
      return actionError("It's not your turn", ERROR_CODES.NOT_YOUR_TURN);
    }

    return await endTurnInternal(game, player);
  } catch (error) {
    console.error("[endTurn] unexpected error", error);
    return actionError("Could not end turn", ERROR_CODES.UNKNOWN_ERROR);
  }
}

/**
 * Draw a card in the DRAW phase
 */
export async function drawCard(gameId: number): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to draw a card"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and DRAW phase
    if (!canPerformAction(game, player.id, "DRAW")) {
      return actionError(
        "Can only draw in DRAW phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Draw one card from deck
    const deckCardIds = parseCardIdArray(player.deck);
    const handCardIds = parseCardIdArray(player.hand);

    if (deckCardIds.length > 0) {
      const drawnCardId = deckCardIds[0];
      const updatedDeck = deckCardIds.slice(1);
      const updatedHand = [...handCardIds, drawnCardId];

      await prisma.player.update({
        where: { id: player.id },
        data: {
          deck: updatedDeck,
          hand: updatedHand,
        },
      });
    }

    // Refetch game and player to get updated data before advancing phase
    const refetchResult = await refetchGameAndPlayer(gameId, player.id);
    if (refetchResult.error) {
      return refetchResult;
    }

    // Auto-advance to AWAKEN phase (or ACTION if AWAKEN is skipped)
    return await advanceToNextPhaseInternal(refetchResult.data.game, refetchResult.data.player);
  } catch (error) {
    console.error("[drawCard] unexpected error", error);
    return actionError("Could not draw card", ERROR_CODES.UNKNOWN_ERROR);
  }
}

/**
 * Awaken a hypnotized card
 */
export async function awakenCard(
  gameId: number,
  row: number,
  col: number,
  discardCardIds: [number, number]
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to awaken a card"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and AWAKEN phase
    if (!canPerformAction(game, player.id, "AWAKEN")) {
      return actionError(
        "Can only awaken in AWAKEN phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Validate awaken not used this turn
    if (game.hasUsedAwaken) {
      return actionError(
        "Awaken already used this turn",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate position
    if (row < 0 || row >= 5 || col < 0 || col >= 5) {
      return actionError("Invalid position", ERROR_CODES.VALIDATION_ERROR);
    }

    // Validate discard cards are in hand
    const handCardIds = parseCardIdArray(player.hand);
    if (
      !handCardIds.includes(discardCardIds[0]) ||
      !handCardIds.includes(discardCardIds[1])
    ) {
      return actionError(
        "Discard cards must be in hand",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Load grid and validate card
    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    const cardEntry = gridData.find((e) => e.row === row && e.col === col);
    if (!cardEntry) {
      return actionError("No card at position", ERROR_CODES.NOT_FOUND);
    }

    if (!cardEntry.hypnotized) {
      return actionError("Card is not hypnotized", ERROR_CODES.VALIDATION_ERROR);
    }

    if (cardEntry.playerId !== player.id) {
      return actionError(
        "Card does not belong to you",
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Update grid: un-hypnotize card
    const updatedGridData = gridData.map((entry) => {
      if (entry.row === row && entry.col === col) {
        return { ...entry, hypnotized: false };
      }
      return entry;
    });

    // Remove discard cards from hand
    const updatedHand = handCardIds.filter(
      (id) => id !== discardCardIds[0] && id !== discardCardIds[1]
    );
    const discardCardIdsArray = parseCardIdArray(player.discardPile);
    const updatedDiscardPile = [
      ...discardCardIdsArray,
      discardCardIds[0],
      discardCardIds[1],
    ];

    // Update in transaction
    await prisma.$transaction([
      prisma.game.update({
        where: { id: gameId },
        data: {
          cardGrid: updatedGridData,
          hasUsedAwaken: true,
        },
      }),
      prisma.player.update({
        where: { id: player.id },
        data: {
          hand: updatedHand,
          discardPile: updatedDiscardPile,
        },
      }),
    ]);

    // Auto-advance to ACTION phase
    const refetchResult = await refetchGameAndPlayer(gameId, player.id);
    if (refetchResult.error) {
      return refetchResult;
    }

    return await advanceToNextPhaseInternal(refetchResult.data.game, refetchResult.data.player);
  } catch (error) {
    console.error("[awakenCard] unexpected error", error);
    return actionError("Could not awaken card", ERROR_CODES.UNKNOWN_ERROR);
  }
}

/**
 * Skip the AWAKEN phase
 */
export async function skipAwaken(
  gameId: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to skip awaken"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and AWAKEN phase
    if (!canPerformAction(game, player.id, "AWAKEN")) {
      return actionError(
        "Can only skip in AWAKEN phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Auto-advance to ACTION phase
    return await advanceToNextPhaseInternal(game, player);
  } catch (error) {
    console.error("[skipAwaken] unexpected error", error);
    return actionError("Could not skip awaken", ERROR_CODES.UNKNOWN_ERROR);
  }
}

/**
 * Draw a card in the ACTION phase
 */
export async function drawCardInActionPhase(
  gameId: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to draw a card"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only draw in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Draw one card from deck
    const deckCardIds = parseCardIdArray(player.deck);
    const handCardIds = parseCardIdArray(player.hand);

    if (deckCardIds.length > 0) {
      const drawnCardId = deckCardIds[0];
      const updatedDeck = deckCardIds.slice(1);
      const updatedHand = [...handCardIds, drawnCardId];

      await prisma.player.update({
        where: { id: player.id },
        data: {
          deck: updatedDeck,
          hand: updatedHand,
        },
      });
    }

    // Refetch game and player to get updated data before advancing phase
    const refetchResult = await refetchGameAndPlayer(gameId, player.id);
    if (refetchResult.error) {
      return refetchResult;
    }

    // Auto-advance to SCORING phase (or skip if no three-in-a-rows)
    return await advanceToNextPhaseInternal(refetchResult.data.game, refetchResult.data.player);
  } catch (error) {
    console.error("[drawCardInActionPhase] unexpected error", error);
    return actionError("Could not draw card", ERROR_CODES.UNKNOWN_ERROR);
  }
}

/**
 * End the ACTION phase
 */
export async function endActionPhase(
  gameId: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to end action phase"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only end ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Auto-advance to SCORING phase (or skip if no three-in-a-rows)
    return await advanceToNextPhaseInternal(game, player);
  } catch (error) {
    console.error("[endActionPhase] unexpected error", error);
    return actionError("Could not end action phase", ERROR_CODES.UNKNOWN_ERROR);
  }
}

/**
 * Get available three-in-a-rows for the current player
 */
export async function getAvailableThreeInARows(
  gameId: number
): Promise<ActionResult<Array<Array<{ row: number; col: number }>>>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to get three-in-a-rows"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and SCORING phase
    if (!canPerformAction(game, player.id, "SCORING")) {
      return actionError(
        "Can only get three-in-a-rows in SCORING phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionSuccess([]);
    }

    // Convert to grid format
    const cardIdToCardMap = await createCardIdToCardMap(gridData);
    const grid = databaseFormatToGrid(gridData, cardIdToCardMap);
    const playerIdMap = createPlayerIdMap(gridData);

    // Detect three-in-a-rows
    const threeInARows = detectThreeInARow(grid, player.id, playerIdMap);

    return actionSuccess(threeInARows);
  } catch (error) {
    console.error("[getAvailableThreeInARows] unexpected error", error);
    return actionError(
      "Could not get three-in-a-rows",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Score a three-in-a-row
 */
export async function scoreThreeInARow(
  gameId: number,
  positions: Array<{ row: number; col: number }>
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to score"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and SCORING phase
    if (!canPerformAction(game, player.id, "SCORING")) {
      return actionError(
        "Can only score in SCORING phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    // Convert to grid format
    const cardIdToCardMap = await createCardIdToCardMap(gridData);
    const grid = databaseFormatToGrid(gridData, cardIdToCardMap);
    const playerIdMap = createPlayerIdMap(gridData);

    // Validate three-in-a-row
    if (!isValidThreeInARow(grid, positions, player.id, playerIdMap)) {
      return actionError(
        "Invalid three-in-a-row",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Remove cards from grid
    const positionSet = new Set(
      positions.map((p) => `${p.row},${p.col}`)
    );
    const updatedGridData = gridData.filter(
      (entry) => !positionSet.has(`${entry.row},${entry.col}`)
    );

    // Increment player's points
    const newPoints = player.currentPoints + 1;

    // Update in transaction
    await prisma.$transaction([
      prisma.game.update({
        where: { id: gameId },
        data: {
          cardGrid: updatedGridData.length > 0 ? updatedGridData : undefined,
        },
      }),
      prisma.player.update({
        where: { id: player.id },
        data: { currentPoints: newPoints },
      }),
    ]);

    // Check win condition
    if (newPoints >= game.pointsToWin) {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: "COMPLETED" },
      });
      return actionSuccess(undefined);
    }

    // Refetch game and player to get updated data
    const refetchResult = await refetchGameAndPlayer(gameId, player.id);
    if (refetchResult.error) {
      return refetchResult;
    }

    const { game: updatedGame, player: updatedPlayer } = refetchResult.data;

    // Recalculate three-in-a-rows with updated grid
    const recalculatedGridData = safeParseCardGrid(updatedGame.cardGrid);
    if (recalculatedGridData && recalculatedGridData.length > 0) {
      const recalculatedCardIdToCardMap = await createCardIdToCardMap(recalculatedGridData);
      const recalculatedGrid = databaseFormatToGrid(recalculatedGridData, recalculatedCardIdToCardMap);
      const recalculatedPlayerIdMap = createPlayerIdMap(recalculatedGridData);
      
      const remainingThreeInARows = detectThreeInARow(
        recalculatedGrid,
        updatedPlayer.id,
        recalculatedPlayerIdMap
      );

      // If no more three-in-a-rows, advance to next turn
      if (remainingThreeInARows.length === 0) {
        return await endTurnInternal(updatedGame, updatedPlayer);
      }
      // Otherwise, stay in SCORING phase (no phase change needed)
    } else {
      // No cards left, advance to next turn
      return await endTurnInternal(updatedGame, updatedPlayer);
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[scoreThreeInARow] unexpected error", error);
    return actionError("Could not score", ERROR_CODES.UNKNOWN_ERROR);
  }
}

