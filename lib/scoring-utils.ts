import type { GameGrid } from "@/lib/game-field-utils";
import type { GridPosition } from "@/lib/game-field-utils";

/**
 * Checks if a set of 3 positions forms a valid three-in-a-row for a specific player
 */
export function isValidThreeInARow(
  grid: GameGrid,
  positions: GridPosition[],
  playerId: number,
  playerIdMap: Map<string, number>
): boolean {
  if (positions.length !== 3) {
    return false;
  }

  // Check all positions are within grid bounds
  for (const pos of positions) {
    if (pos.row < 0 || pos.row >= 5 || pos.col < 0 || pos.col >= 5) {
      return false;
    }
  }

  // Get cards at positions
  const cards = positions.map((pos) => grid[pos.row][pos.col].card);

  // All positions must have cards
  if (cards.some((card) => card === null)) {
    return false;
  }

  // All cards must be creature cards (magic/instant are never on grid)
  if (cards.some((card) => card!.type !== "creature")) {
    return false;
  }

  // All cards must belong to the specified player
  for (const pos of positions) {
    const key = `${pos.row},${pos.col}`;
    const cardPlayerId = playerIdMap.get(key);
    if (cardPlayerId !== playerId) {
      return false;
    }
  }

  return true;
}

/**
 * Detects all three-in-a-row sets for a specific player
 * Returns array of position arrays (each array is one three-in-a-row)
 */
export function detectThreeInARow(
  grid: GameGrid,
  playerId: number,
  playerIdMap: Map<string, number> // Map of "row,col" to playerId
): GridPosition[][] {
  const sets: GridPosition[][] = [];

  // Check horizontal lines (5 possible in 5x5 grid)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= 2; col++) {
      const positions: GridPosition[] = [
        { row, col },
        { row, col: col + 1 },
        { row, col: col + 2 },
      ];
      if (isValidThreeInARow(grid, positions, playerId, playerIdMap)) {
        sets.push(positions);
      }
    }
  }

  // Check vertical lines (5 possible)
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row <= 2; row++) {
      const positions: GridPosition[] = [
        { row, col },
        { row: row + 1, col },
        { row: row + 2, col },
      ];
      if (isValidThreeInARow(grid, positions, playerId, playerIdMap)) {
        sets.push(positions);
      }
    }
  }

  // Check main diagonals (top-left to bottom-right)
  for (let start = 0; start <= 2; start++) {
    const positions: GridPosition[] = [
      { row: start, col: start },
      { row: start + 1, col: start + 1 },
      { row: start + 2, col: start + 2 },
    ];
    if (isValidThreeInARow(grid, positions, playerId, playerIdMap)) {
      sets.push(positions);
    }
  }

  // Check anti-diagonals (top-right to bottom-left)
  for (let start = 0; start <= 2; start++) {
    const positions: GridPosition[] = [
      { row: start, col: 4 - start },
      { row: start + 1, col: 3 - start },
      { row: start + 2, col: 2 - start },
    ];
    if (isValidThreeInARow(grid, positions, playerId, playerIdMap)) {
      sets.push(positions);
    }
  }

  return sets;
}

/**
 * Creates a playerId map from database grid format
 */
export function createPlayerIdMap(
  gridData: Array<{ row: number; col: number; playerId?: number }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of gridData) {
    if (entry.playerId !== undefined) {
      const key = `${entry.row},${entry.col}`;
      map.set(key, entry.playerId);
    }
  }
  return map;
}
