import type { Game, Player } from "@prisma/client";

export type GamePhase = "DRAW" | "AWAKEN" | "ACTION" | "SCORING";

/**
 * Checks if it's the specified player's turn
 */
export function isPlayerTurn(game: Game, playerId: number): boolean {
  return game.currentTurnPlayerId === playerId;
}

/**
 * Gets the current phase of the game
 */
export function getCurrentPhase(game: Game): GamePhase {
  return game.currentPhase as GamePhase;
}

/**
 * Validates if a player can perform a specific action based on turn and phase
 */
export function canPerformAction(
  game: Game,
  playerId: number,
  requiredPhase: GamePhase
): boolean {
  // Game must be in progress
  if (game.status !== "IN_PROGRESS") {
    return false;
  }

  // Must be player's turn
  if (!isPlayerTurn(game, playerId)) {
    return false;
  }

  // Phase must match
  const currentPhase = getCurrentPhase(game);
  if (currentPhase !== requiredPhase) {
    return false;
  }

  return true;
}

/**
 * Gets the other player in a two-player game
 */
export function getOtherPlayer(
  players: Player[],
  currentPlayerId: number
): Player | null {
  const otherPlayer = players.find((p) => p.id !== currentPlayerId);
  return otherPlayer ?? null;
}
