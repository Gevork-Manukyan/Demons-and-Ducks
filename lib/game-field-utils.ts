import type { Card } from "@/lib/card-types";
import { cardGridEntrySchema } from "@/lib/zod-schemas";

export type GridPosition = {
  row: number;
  col: number;
};

export type GridCell = {
  card: Card | null;
  position: GridPosition;
  isValid: boolean;
  hypnotized: boolean;
  playerId: number | null;
};

export type GameGrid = GridCell[][];

/**
 * Creates an empty 5x5 grid
 */
export function createEmptyGrid(): GameGrid {
  const grid: GameGrid = [];
  for (let row = 0; row < 5; row++) {
    const rowCells: GridCell[] = [];
    for (let col = 0; col < 5; col++) {
      rowCells.push({
        card: null,
        position: { row, col },
        isValid: false,
        hypnotized: false,
        playerId: null,
      });
    }
    grid.push(rowCells);
  }
  return grid;
}

/**
 * Gets the center position for the first card (always center of 5x5 grid)
 */
export function getFirstCardPosition(): GridPosition {
  return { row: 2, col: 2 }; // Center of 5x5 grid (0-indexed)
}

/**
 * Checks if a position on the grid is empty
 */
export function isPositionEmpty(
    grid: GameGrid,
    row: number,
    col: number
  ): boolean {
    if (row < 0 || row >= 5 || col < 0 || col >= 5) {
      return false;
    }
    return grid[row][col].card === null;
  }

/**
 * Gets all placed card positions from the grid
 */
function getPlacedCardPositions(grid: GameGrid): GridPosition[] {
  const positions: GridPosition[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (!isPositionEmpty(grid, row, col)) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

/**
 * Determines valid positions for placing the next card
 */
export function getValidPlacementPositions(grid: GameGrid): GridPosition[] {
  const placedPositions = getPlacedCardPositions(grid);
  
  // First card: always placed in center
  if (placedPositions.length === 0) {
    return [getFirstCardPosition()];
  }
  
  // Subsequent cards: find valid positions based on 3x3 subsections
  // Check all possible 3x3 subsections in the 5x5 grid
  // A 3x3 subsection can start at positions (0,0) through (2,2)
  const validPositions = new Set<string>();
  
  for (let startRow = 0; startRow <= 2; startRow++) {
    for (let startCol = 0; startCol <= 2; startCol++) {
      // Check if all placed cards are within this 3x3 subsection
      const allCardsInSubsection = placedPositions.every((pos) => {
        return (
          pos.row >= startRow &&
          pos.row < startRow + 3 &&
          pos.col >= startCol &&
          pos.col < startCol + 3
        );
      });
      
      // If all cards fit in this subsection, all empty spaces in it are valid
      if (allCardsInSubsection) {
        for (let r = startRow; r < startRow + 3; r++) {
          for (let c = startCol; c < startCol + 3; c++) {
            if (isPositionEmpty(grid, r, c)) {
              validPositions.add(`${r},${c}`);
            }
          }
        }
      }
    }
  }
  
  return Array.from(validPositions).map((posStr) => {
    const [row, col] = posStr.split(",").map(Number);
    return { row, col };
  });
}

/**
 * Updates the grid with valid positions marked
 */
export function updateGridValidPositions(grid: GameGrid): GameGrid {
  const validPositions = getValidPlacementPositions(grid);
  
  const newGrid: GameGrid = grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const isValid = validPositions.some(
        (pos) => pos.row === rowIndex && pos.col === colIndex
      );
      return {
        ...cell,
        isValid,
      };
    })
  );
  
  return newGrid;
}

/**
 * Places a card at a specific position
 */
export function placeCard(
  grid: GameGrid,
  position: GridPosition,
  card: Card,
  playerId: number
): GameGrid {
  const newGrid: GameGrid = grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (rowIndex === position.row && colIndex === position.col) {
        return {
          ...cell,
          card,
          hypnotized: false,
          playerId,
        };
      }
      return {
        ...cell,
        playerId: cell.playerId,
      };
    })
  );
  
  return updateGridValidPositions(newGrid);
}

/**
 * Database format for card grid (sparse array)
 */
export type DatabaseGridFormat = Array<{
  cardId: number;
  row: number;
  col: number;
  hypnotized: boolean;
  playerId: number;
}> | null;

/**
 * Converts a GameGrid to database format (sparse array)
 * Requires a function to get card ID from Card object
 */
export function gridToDatabaseFormat(
  grid: GameGrid,
  getCardId: (card: Card) => number
): DatabaseGridFormat {
  const entries: Array<{
    cardId: number;
    row: number;
    col: number;
    hypnotized: boolean;
    playerId: number;
  }> = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = grid[row][col];
      if (cell.card !== null) {
        const cardId = getCardId(cell.card);
        if (cell.playerId === null) {
          throw new Error(`Missing playerId for card at position (${row}, ${col})`);
        }
        entries.push({
          cardId,
          row,
          col,
          hypnotized: cell.hypnotized,
          playerId: cell.playerId,
        });
      }
    }
  }

  return entries.length > 0 ? entries : null;
}

/**
 * Converts database format back to GameGrid
 * Requires a map from card ID to Card object
 */
export function databaseFormatToGrid(
  data: unknown,
  cardIdToCardMap: Map<number, Card>
): GameGrid {
  const grid = createEmptyGrid();

  // If no data, return empty grid
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return updateGridValidPositions(grid);
  }

  // Validate and parse the data
  if (!Array.isArray(data)) {
    throw new Error("Invalid grid data format: expected array");
  }

  // Place cards from database format
  for (const entry of data) {
    const validatedEntry = cardGridEntrySchema.parse(entry);
    const { cardId, row, col, hypnotized, playerId } = validatedEntry;

    const card = cardIdToCardMap.get(cardId);
    if (!card) {
      throw new Error(`Card with ID ${cardId} not found`);
    }

    grid[row][col] = {
      card,
      position: { row, col },
      isValid: false, // Will be updated by updateGridValidPositions
      hypnotized,
      playerId,
    };
  }

  return updateGridValidPositions(grid);
}

/**
 * Updates the hypnotized state of a card at a specific position
 */
export function updateCardHypnotized(
  grid: GameGrid,
  position: GridPosition,
  hypnotized: boolean
): GameGrid {
  const newGrid: GameGrid = grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (rowIndex === position.row && colIndex === position.col) {
        if (cell.card === null) {
          throw new Error(
            `Cannot update hypnotized state: no card at position (${position.row}, ${position.col})`
          );
        }
        return {
          ...cell,
          hypnotized,
        };
      }
      return cell;
    })
  );

  return newGrid;
}

