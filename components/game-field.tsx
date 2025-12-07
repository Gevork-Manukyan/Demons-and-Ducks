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
  selectedScoringCards?: Array<{ row: number; col: number }>;
  onScoringCardSelect?: (row: number, col: number) => void;
  isScoringPhase?: boolean;
  isAwakenPhase?: boolean;
  selectedHypnotizedCard?: { row: number; col: number } | null;
  onHypnotizedCardSelect?: (row: number, col: number) => void;
  canPlaceCreature?: boolean;
};

export function GameField({ 
  grid, 
  selectedCard, 
  onCardPlace,
  availableThreeInARows = [],
  selectedScoringCards = [],
  onScoringCardSelect,
  isScoringPhase = false,
  isAwakenPhase = false,
  selectedHypnotizedCard = null,
  onHypnotizedCardSelect,
  canPlaceCreature = true,
}: GameFieldProps) {

  // Update grid valid positions
  const updatedGrid = useMemo(() => {
    return updateGridValidPositions(grid);
  }, [grid]);

  // Helper to check if a position is part of any valid three-in-a-row (for highlighting)
  const validScoringPositionSet = useMemo(() => {
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

  const isPositionValidForScoring = useCallback(
    (row: number, col: number) => validScoringPositionSet.has(`${row},${col}`),
    [validScoringPositionSet]
  );

  // Helper to check if a position is selected for scoring
  const selectedScoringPositionSet = useMemo(() => {
    return new Set(selectedScoringCards.map((pos) => `${pos.row},${pos.col}`));
  }, [selectedScoringCards]);

  const isPositionSelectedForScoring = useCallback(
    (row: number, col: number) => selectedScoringPositionSet.has(`${row},${col}`),
    [selectedScoringPositionSet]
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
    
    // Show positions if they have a card OR if they are valid for placement (only if creature card is selected and placement is allowed)
    const canPlaceCard = !isScoringPhase && !isAwakenPhase && canPlaceCreature && selectedCard !== null && selectedCard.type === "creature";
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = updatedGrid[row][col];
        if (cell.card !== null || (cell.isValid && canPlaceCard)) {
          positions.push({ row, col, cell });
        }
      }
    }
    return positions;
  }, [updatedGrid, selectedCard, isScoringPhase, isAwakenPhase, canPlaceCreature]);

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
            const isValidForScoring = isPositionValidForScoring(row, col);
            const isSelectedForScoring = isPositionSelectedForScoring(row, col);
            
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
                      isScoringPhase && isValidForScoring
                        ? isSelectedForScoring
                          ? "ring-4 ring-green-500 cursor-pointer"
                          : "ring-2 ring-yellow-400 cursor-pointer"
                        : isAwakenPhase && cell.hypnotized
                        ? selectedHypnotizedCard?.row === row && selectedHypnotizedCard?.col === col
                          ? "ring-4 ring-blue-500 cursor-pointer"
                          : "ring-2 ring-purple-400 cursor-pointer"
                        : ""
                    }`}
                    onClick={() => {
                      if (isScoringPhase && isValidForScoring && onScoringCardSelect) {
                        onScoringCardSelect(row, col);
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
                      if (!isScoringPhase && !isAwakenPhase && canPlaceCreature && selectedCard && selectedCard.type === "creature") {
                        onCardPlace(selectedCard, row, col);
                      }
                    }}
                    disabled={isScoringPhase || isAwakenPhase || !canPlaceCreature || (selectedCard !== null && selectedCard.type !== "creature")}
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

