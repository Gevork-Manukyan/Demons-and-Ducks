"use client";

import { useMemo } from "react";
import { GameCard } from "@/components/game-card";
import { EmptyCardSpace } from "@/components/empty-card-space";
import type { Card } from "@/lib/card-types";
import {
  updateGridValidPositions,
  type GameGrid,
} from "@/lib/game-field-utils";

type GameFieldProps = {
  grid: GameGrid;
  selectedCard: Card | null;
  onCardPlace?: (card: Card, row: number, col: number) => void;
};

export function GameField({ grid, selectedCard, onCardPlace }: GameFieldProps) {

  // Update grid valid positions
  const updatedGrid = useMemo(() => {
    return updateGridValidPositions(grid);
  }, [grid]);

  // Determine which positions to display (only valid positions)
  const positionsToDisplay = useMemo(() => {
    const positions: Array<{ row: number; col: number; cell: GameGrid[0][0] }> = [];
    const placedCards = [];
    
    // First, collect all positions with cards
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = updatedGrid[row][col];
        if (cell.card !== null) {
          placedCards.push({ row, col, cell });
        }
      }
    }
    
    // If no cards are placed, show only the center position
    if (placedCards.length === 0) {
      positions.push({ row: 2, col: 2, cell: updatedGrid[2][2] });
      return positions;
    }
    
    // Show positions if they have a card OR if they are valid for placement
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = updatedGrid[row][col];
        if (cell.card !== null || cell.isValid) {
          positions.push({ row, col, cell });
        }
      }
    }
    return positions;
  }, [updatedGrid]);

  function renderSingleSpace() {
    if (positionsToDisplay.length === 1) {
      const { row, col, cell } = positionsToDisplay[0];
      if (cell.card) {
        return <GameCard card={cell.card} />
      } else {
        return (
          <EmptyCardSpace
            onClick={() => {
              if (selectedCard) {
                onCardPlace?.(selectedCard, row, col);
              }
            }}
          />
        );
      }
    }
    return null;
  }

  return (
    <div className="w-full h-full bg-zinc-50 border-2 border-zinc-300 rounded-lg p-4 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        {positionsToDisplay.length === 1 ? (
          renderSingleSpace()
        ) : (
          <div className="grid grid-cols-5 gap-2 auto-rows-max justify-items-center">
            {positionsToDisplay.map(({ row, col, cell }) => (
              <div key={`${row}-${col}`} style={{ gridColumn: col + 1, gridRow: row + 1 }}>
                {cell.card ? (
                  <GameCard card={cell.card} />
                ) : (
                  <EmptyCardSpace
                    onClick={() => {
                      if (selectedCard) {
                        onCardPlace?.(selectedCard, row, col);
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

