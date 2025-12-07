"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
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
  availableThreeInARows?: Array<Array<{ row: number; col: number }>>;
  selectedThreeInARow?: Array<{ row: number; col: number }> | null;
  onThreeInARowSelect?: (positions: Array<{ row: number; col: number }>) => void;
  isScoringPhase?: boolean;
  isAwakenPhase?: boolean;
  selectedHypnotizedCard?: { row: number; col: number } | null;
  onHypnotizedCardSelect?: (row: number, col: number) => void;
};

export function GameField({ 
  grid, 
  selectedCard, 
  onCardPlace,
  availableThreeInARows = [],
  selectedThreeInARow = null,
  onThreeInARowSelect,
  isScoringPhase = false,
  isAwakenPhase = false,
  selectedHypnotizedCard = null,
  onHypnotizedCardSelect,
}: GameFieldProps) {

  // Update grid valid positions
  const updatedGrid = useMemo(() => {
    return updateGridValidPositions(grid);
  }, [grid]);

  // Helper to check if a position is in a three-in-a-row
  const threeInARowPositionSet = useMemo(() => {
    const positionSet = new Set<string>();
    if (isScoringPhase && availableThreeInARows.length > 0) {
      availableThreeInARows.forEach((threeInARow) => {
        threeInARow.forEach((pos) => {
          positionSet.add(`${pos.row},${pos.col}`);
        });
      });
    }
    return positionSet;
  }, [isScoringPhase, availableThreeInARows]);

  const isPositionInThreeInARow = useCallback(
    (row: number, col: number) => threeInARowPositionSet.has(`${row},${col}`),
    [threeInARowPositionSet]
  );

  // Helper to check if a position is in the selected three-in-a-row
  const selectedThreeInARowPositionSet = useMemo(() => {
    if (!selectedThreeInARow) return null;
    return new Set(selectedThreeInARow.map((pos) => `${pos.row},${pos.col}`));
  }, [selectedThreeInARow]);

  const isPositionInSelectedThreeInARow = useCallback(
    (row: number, col: number) => {
      if (!selectedThreeInARowPositionSet) return false;
      return selectedThreeInARowPositionSet.has(`${row},${col}`);
    },
    [selectedThreeInARowPositionSet]
  );

  // Helper to find which three-in-a-row a position belongs to
  const getThreeInARowForPosition = useCallback(
    (row: number, col: number) => {
      if (!isScoringPhase || !onThreeInARowSelect) return null;
      return availableThreeInARows.find((threeInARow) =>
        threeInARow.some((pos) => pos.row === row && pos.col === col)
      ) || null;
    },
    [isScoringPhase, availableThreeInARows, onThreeInARowSelect]
  );

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
    
    // Show positions if they have a card OR if they are valid for placement (only if creature card is selected)
    const canPlaceCard = !isScoringPhase && !isAwakenPhase && selectedCard !== null && selectedCard.type === "creature";
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = updatedGrid[row][col];
        if (cell.card !== null || (cell.isValid && canPlaceCard)) {
          positions.push({ row, col, cell });
        }
      }
    }
    return positions;
  }, [updatedGrid, selectedCard, isScoringPhase, isAwakenPhase]);

  // Card dimensions and gap for positioning (in pixels)
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
  const containerWidth = useMemo(() => {
    return (bounds.maxCol - bounds.minCol + 1) * cardWidth + (bounds.maxCol - bounds.minCol) * gap;
  }, [bounds]);

  const containerHeight = useMemo(() => {
    return (bounds.maxRow - bounds.minRow + 1) * cardHeight + (bounds.maxRow - bounds.minRow) * gap;
  }, [bounds]);

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
            const inThreeInARow = isPositionInThreeInARow(row, col);
            const inSelectedThreeInARow = isPositionInSelectedThreeInARow(row, col);
            const threeInARowForPosition = getThreeInARowForPosition(row, col);
            
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
                  <div
                    className={`relative ${
                      isScoringPhase && inThreeInARow
                        ? inSelectedThreeInARow
                          ? "ring-4 ring-green-500"
                          : "ring-2 ring-yellow-400 cursor-pointer"
                        : isAwakenPhase && cell.hypnotized
                        ? selectedHypnotizedCard?.row === row && selectedHypnotizedCard?.col === col
                          ? "ring-4 ring-blue-500 cursor-pointer"
                          : "ring-2 ring-purple-400 cursor-pointer"
                        : ""
                    }`}
                    onClick={() => {
                      if (isScoringPhase && threeInARowForPosition && onThreeInARowSelect) {
                        onThreeInARowSelect(threeInARowForPosition);
                      } else if (isAwakenPhase && cell.hypnotized && onHypnotizedCardSelect) {
                        onHypnotizedCardSelect(row, col);
                      }
                    }}
                  >
                    <GameCard card={cell.card} />
                  </div>
                ) : (
                  <EmptyCardSpace
                    onClick={() => {
                      if (!isScoringPhase && !isAwakenPhase && selectedCard && selectedCard.type === "creature") {
                        onCardPlace(selectedCard, row, col);
                      }
                    }}
                    disabled={isScoringPhase || isAwakenPhase || (selectedCard !== null && selectedCard.type !== "creature")}
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

