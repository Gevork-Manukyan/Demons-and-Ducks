"use server";

import { prisma } from "@/lib/prisma";
import {
  ActionResult,
  actionSuccess,
  actionError,
} from "@/lib/errors";
import { ERROR_CODES } from "@/lib/error-codes";
import { parseCardIdArray, safeParseCardGrid } from "@/lib/zod-schemas";
import {
  databaseFormatToGrid,
  gridToDatabaseFormat,
  updateCardHypnotized,
  getValidPlacementPositions,
} from "@/lib/game-field-utils";
import { createCardIdToCardMap } from "@/actions/game-actions";
import { canPerformAction } from "@/lib/turn-validation";
import type { Player } from "@prisma/client";
import { getGameAndPlayer } from "@/lib/game-action-utils";

/**
 * Resolve destroy effect: choose opponent creature and destroy it
 */
export async function resolveDestroyEffect(
  gameId: number,
  effectCardId: number,
  targetRow: number,
  targetCol: number,
  drawCount?: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to resolve effect"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only resolve effects in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Validate position
    if (targetRow < 0 || targetRow >= 5 || targetCol < 0 || targetCol >= 5) {
      return actionError("Invalid position", ERROR_CODES.VALIDATION_ERROR);
    }

    // Load grid
    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    const targetEntry = gridData.find(
      (e) => e.row === targetRow && e.col === targetCol
    );
    if (!targetEntry) {
      return actionError("No card at target position", ERROR_CODES.NOT_FOUND);
    }

    // Validate target is opponent's creature
    if (targetEntry.playerId === player.id) {
      return actionError(
        "Cannot destroy your own creature",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Get opponent player
    const opponent = game.players.find((p: Player) => p.id === targetEntry.playerId);
    if (!opponent) {
      return actionError("Opponent not found", ERROR_CODES.NOT_FOUND);
    }

    // Remove card from grid
    const updatedGridData = gridData.filter(
      (e) => !(e.row === targetRow && e.col === targetCol)
    );

    // Add card to opponent's discard pile
    const opponentDiscardCardIds = parseCardIdArray(opponent.discardPile);
    const updatedOpponentDiscardPile = [
      ...opponentDiscardCardIds,
      targetEntry.cardId,
    ];

    // Update in transaction
    await prisma.$transaction([
      prisma.game.update({
        where: { id: gameId },
        data: {
          cardGrid: updatedGridData.length > 0 ? updatedGridData : undefined,
        },
      }),
      prisma.player.update({
        where: { id: opponent.id },
        data: {
          discardPile: updatedOpponentDiscardPile,
        },
      }),
    ]);

    // Process deferred draw if any
    if (drawCount && drawCount > 0) {
      const { drawCardsForPlayer } = await import("@/actions/game-actions");
      const drawResult = await drawCardsForPlayer(player.id, drawCount);
      if (drawResult.error) {
        return drawResult;
      }
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[resolveDestroyEffect] unexpected error", error);
    return actionError(
      "Could not resolve destroy effect",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Resolve repel effect: choose creature and return it to owner's hand
 */
export async function resolveRepelEffect(
  gameId: number,
  effectCardId: number,
  targetRow: number,
  targetCol: number,
  drawCount?: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to resolve effect"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only resolve effects in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Validate position
    if (targetRow < 0 || targetRow >= 5 || targetCol < 0 || targetCol >= 5) {
      return actionError("Invalid position", ERROR_CODES.VALIDATION_ERROR);
    }

    // Load grid
    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    const targetEntry = gridData.find(
      (e) => e.row === targetRow && e.col === targetCol
    );
    if (!targetEntry) {
      return actionError("No card at target position", ERROR_CODES.NOT_FOUND);
    }

    // Get card owner
    const cardOwner = game.players.find((p: Player) => p.id === targetEntry.playerId);
    if (!cardOwner) {
      return actionError("Card owner not found", ERROR_CODES.NOT_FOUND);
    }

    // Remove card from grid
    const updatedGridData = gridData.filter(
      (e) => !(e.row === targetRow && e.col === targetCol)
    );

    // Add card to owner's hand
    const ownerHandCardIds = parseCardIdArray(cardOwner.hand);
    const updatedOwnerHand = [...ownerHandCardIds, targetEntry.cardId];

    // Update in transaction
    await prisma.$transaction([
      prisma.game.update({
        where: { id: gameId },
        data: {
          cardGrid: updatedGridData.length > 0 ? updatedGridData : undefined,
        },
      }),
      prisma.player.update({
        where: { id: cardOwner.id },
        data: {
          hand: updatedOwnerHand,
        },
      }),
    ]);

    // Process deferred draw if any
    if (drawCount && drawCount > 0) {
      const { drawCardsForPlayer } = await import("@/actions/game-actions");
      const drawResult = await drawCardsForPlayer(player.id, drawCount);
      if (drawResult.error) {
        return drawResult;
      }
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[resolveRepelEffect] unexpected error", error);
    return actionError(
      "Could not resolve repel effect",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Resolve displace effect: move creature to empty space
 */
export async function resolveDisplaceEffect(
  gameId: number,
  effectCardId: number,
  sourceRow: number,
  sourceCol: number,
  targetRow: number,
  targetCol: number,
  drawCount?: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to resolve effect"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only resolve effects in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Validate positions
    if (
      sourceRow < 0 ||
      sourceRow >= 5 ||
      sourceCol < 0 ||
      sourceCol >= 5 ||
      targetRow < 0 ||
      targetRow >= 5 ||
      targetCol < 0 ||
      targetCol >= 5
    ) {
      return actionError("Invalid position", ERROR_CODES.VALIDATION_ERROR);
    }

    // Load grid
    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    const cardIdToCardMap = await createCardIdToCardMap(gridData);
    const currentGrid = databaseFormatToGrid(gridData, cardIdToCardMap);

    // Validate source has a card
    if (currentGrid[sourceRow][sourceCol].card === null) {
      return actionError(
        "No card at source position",
        ERROR_CODES.NOT_FOUND
      );
    }

    // Validate target is empty
    if (currentGrid[targetRow][targetCol].card !== null) {
      return actionError(
        "Target position is not empty",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Get source card info
    const sourceEntry = gridData.find(
      (e) => e.row === sourceRow && e.col === sourceCol
    );
    if (!sourceEntry) {
      return actionError("Source entry not found", ERROR_CODES.NOT_FOUND);
    }

    // Remove source card temporarily to calculate valid positions
    // This simulates the card being removed before placement
    const gridWithoutSource = currentGrid.map((row, r) =>
      row.map((cell, c) => {
        if (r === sourceRow && c === sourceCol) {
          return {
            ...cell,
            card: null,
            playerId: null,
            hypnotized: false,
          };
        }
        return cell;
      })
    );

    // Calculate valid positions after removing the source card
    const validPositions = getValidPlacementPositions(gridWithoutSource);
    const isValidTarget = validPositions.some(
      (pos) => pos.row === targetRow && pos.col === targetCol
    );

    if (!isValidTarget) {
      return actionError(
        "Target position is not a valid placement position. Cards must be placed within a 3x3 grid area.",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Move card: remove from source, add to target
    const updatedGridData = gridData
      .filter((e) => !(e.row === sourceRow && e.col === sourceCol))
      .concat({
        cardId: sourceEntry.cardId,
        row: targetRow,
        col: targetCol,
        hypnotized: sourceEntry.hypnotized,
        playerId: sourceEntry.playerId,
      });

    // Update game
    await prisma.game.update({
      where: { id: gameId },
      data: {
        cardGrid: updatedGridData,
      },
    });

    // Process deferred draw if any
    if (drawCount && drawCount > 0) {
      const { drawCardsForPlayer } = await import("@/actions/game-actions");
      const drawResult = await drawCardsForPlayer(player.id, drawCount);
      if (drawResult.error) {
        return drawResult;
      }
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[resolveDisplaceEffect] unexpected error", error);
    return actionError(
      "Could not resolve displace effect",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Resolve swap effect: swap positions of two creatures
 */
export async function resolveSwapEffect(
  gameId: number,
  effectCardId: number,
  pos1Row: number,
  pos1Col: number,
  pos2Row: number,
  pos2Col: number,
  drawCount?: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to resolve effect"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only resolve effects in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Validate positions
    if (
      pos1Row < 0 ||
      pos1Row >= 5 ||
      pos1Col < 0 ||
      pos1Col >= 5 ||
      pos2Row < 0 ||
      pos2Row >= 5 ||
      pos2Col < 0 ||
      pos2Col >= 5
    ) {
      return actionError("Invalid position", ERROR_CODES.VALIDATION_ERROR);
    }

    // Load grid
    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    const entry1 = gridData.find((e) => e.row === pos1Row && e.col === pos1Col);
    const entry2 = gridData.find((e) => e.row === pos2Row && e.col === pos2Col);

    if (!entry1 || !entry2) {
      return actionError(
        "Both positions must have cards",
        ERROR_CODES.NOT_FOUND
      );
    }

    // Swap positions
    const updatedGridData = gridData.map((entry) => {
      if (entry.row === pos1Row && entry.col === pos1Col) {
        return {
          ...entry2,
          row: pos1Row,
          col: pos1Col,
        };
      }
      if (entry.row === pos2Row && entry.col === pos2Col) {
        return {
          ...entry1,
          row: pos2Row,
          col: pos2Col,
        };
      }
      return entry;
    });

    // Update game
    await prisma.game.update({
      where: { id: gameId },
      data: {
        cardGrid: updatedGridData,
      },
    });

    // Process deferred draw if any
    if (drawCount && drawCount > 0) {
      const { drawCardsForPlayer } = await import("@/actions/game-actions");
      const drawResult = await drawCardsForPlayer(player.id, drawCount);
      if (drawResult.error) {
        return drawResult;
      }
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[resolveSwapEffect] unexpected error", error);
    return actionError(
      "Could not resolve swap effect",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

/**
 * Resolve hypnotize effect: set creature to hypnotized (face down)
 */
export async function resolveHypnotizeEffect(
  gameId: number,
  effectCardId: number,
  targetRow: number,
  targetCol: number,
  drawCount?: number
): Promise<ActionResult<void>> {
  try {
    const result = await getGameAndPlayer(
      gameId,
      "You must be logged in to resolve effect"
    );

    if (result.error) {
      return result;
    }

    const { game, player } = result.data;

    // Validate it's player's turn and ACTION phase
    if (!canPerformAction(game, player.id, "ACTION")) {
      return actionError(
        "Can only resolve effects in ACTION phase on your turn",
        ERROR_CODES.INVALID_PHASE
      );
    }

    // Validate position
    if (targetRow < 0 || targetRow >= 5 || targetCol < 0 || targetCol >= 5) {
      return actionError("Invalid position", ERROR_CODES.VALIDATION_ERROR);
    }

    // Load grid
    const gridData = safeParseCardGrid(game.cardGrid);
    if (!gridData || gridData.length === 0) {
      return actionError("No cards on field", ERROR_CODES.NOT_FOUND);
    }

    const cardIdToCardMap = await createCardIdToCardMap(gridData);
    const currentGrid = databaseFormatToGrid(gridData, cardIdToCardMap);

    // Validate target has a card
    if (currentGrid[targetRow][targetCol].card === null) {
      return actionError("No card at target position", ERROR_CODES.NOT_FOUND);
    }

    // Update hypnotized state
    const updatedGrid = updateCardHypnotized(
      currentGrid,
      { row: targetRow, col: targetCol },
      true
    );

    // Convert back to database format
    const updatedGridData = gridToDatabaseFormat(
      updatedGrid,
      (card) => card.id
    );

    // Update game
    await prisma.game.update({
      where: { id: gameId },
      data: {
        cardGrid: updatedGridData === null ? undefined : updatedGridData,
      },
    });

    // Process deferred draw if any
    if (drawCount && drawCount > 0) {
      const { drawCardsForPlayer } = await import("@/actions/game-actions");
      const drawResult = await drawCardsForPlayer(player.id, drawCount);
      if (drawResult.error) {
        return drawResult;
      }
    }

    return actionSuccess(undefined);
  } catch (error) {
    console.error("[resolveHypnotizeEffect] unexpected error", error);
    return actionError(
      "Could not resolve hypnotize effect",
      ERROR_CODES.UNKNOWN_ERROR
    );
  }
}
