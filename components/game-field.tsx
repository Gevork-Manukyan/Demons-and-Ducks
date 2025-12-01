"use client";

import { useMemo, useRef, useEffect, useState } from "react";
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
  onCardPlace: (card: Card, row: number, col: number) => void;
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

  // Card dimensions and gap for positioning (in pixals)
  const cardWidth = 120;
  const cardHeight = 168;
  const gap = 8;

  // Calculate the bounding box of all displayed positions
  const bounds = useMemo(() => {
    if (positionsToDisplay.length === 0) {
      return { minRow: 2, maxRow: 2, minCol: 2, maxCol: 2 };
    }
    let minRow = 5, maxRow = -1, minCol = 5, maxCol = -1;
    positionsToDisplay.forEach(({ row, col }) => {
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    });
    return { minRow, maxRow, minCol, maxCol };
  }, [positionsToDisplay]);

  // Calculate container dimensions
  const containerWidth = (bounds.maxCol - bounds.minCol + 1) * cardWidth + (bounds.maxCol - bounds.minCol) * gap;
  const containerHeight = (bounds.maxRow - bounds.minRow + 1) * cardHeight + (bounds.maxRow - bounds.minRow) * gap;

  // Scale the cards to fit the parent element
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const availableWidth = parent.clientWidth;
          const availableHeight = parent.clientHeight;
          
          const widthScale = availableWidth / containerWidth;
          const heightScale = availableHeight / containerHeight;
          
          setScale(Math.min(1, widthScale, heightScale));
        }
      }
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }
    
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, [containerWidth, containerHeight]);

  return (
    <div className="h-full min-h-0 flex items-center justify-center overflow-hidden">
      <div className="flex items-center justify-center" style={{ maxWidth: 'fit-content', maxHeight: '100%' }} ref={containerRef}>
        <div
          className="relative origin-center"
          style={{
            width: containerWidth,
            height: containerHeight,
            transform: `scale(${scale})`,
            margin: '2px',
          }}
        >
          {positionsToDisplay.map(({ row, col, cell }) => {
            const x = (col - bounds.minCol) * (cardWidth + gap);
            const y = (row - bounds.minRow) * (cardHeight + gap);
            return (
              <div
                key={`${row}-${col}`}
                className="absolute"
                style={{
                  left: x,
                  top: y,
                }}
              >
                {cell.card ? (
                  <GameCard card={cell.card} />
                ) : (
                  <EmptyCardSpace
                    onClick={() => {
                      if (selectedCard) {
                        onCardPlace(selectedCard, row, col);
                      }
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

