import type { Card } from "@/lib/card-types";

export type GridPosition = {
  row: number;
  col: number;
};

export type GridCell = {
  card: Card | null;
  position: GridPosition;
  isValid: boolean;
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
  card: Card
): GameGrid {
  const newGrid: GameGrid = grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (rowIndex === position.row && colIndex === position.col) {
        return {
          ...cell,
          card,
        };
      }
      return {
        ...cell,
      };
    })
  );
  
  return updateGridValidPositions(newGrid);
}

