"use client";

import { useState, useCallback } from "react";
import type { Card } from "@/lib/card-types";
import {
  createEmptyGrid,
  updateGridValidPositions,
  placeCard as placeCardOnGrid,
  updateCardHypnotized,
  type GameGrid,
} from "@/lib/game-field-utils";

type UseCardPlacementReturn = {
  selectedCard: Card | null;
  grid: GameGrid;
  selectCard: (card: Card | null) => void;
  placeCard: (card: Card, row: number, col: number) => void;
  clearSelection: () => void;
  updateHypnotized: (row: number, col: number, hypnotized: boolean) => void;
};

export function useCardPlacement(initialGrid?: GameGrid): UseCardPlacementReturn {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [grid, setGrid] = useState<GameGrid>(() => {
    if (initialGrid) {
      return initialGrid;
    }
    const emptyGrid = createEmptyGrid();
    return updateGridValidPositions(emptyGrid);
  });

  const selectCard = useCallback((card: Card | null) => {
    setSelectedCard(card);
  }, []);

  const placeCard = useCallback((card: Card, row: number, col: number) => {
    setGrid((currentGrid) => placeCardOnGrid(currentGrid, { row, col }, card));
    setSelectedCard(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCard(null);
  }, []);

  const updateHypnotized = useCallback((row: number, col: number, hypnotized: boolean) => {
    setGrid((currentGrid) => updateCardHypnotized(currentGrid, { row, col }, hypnotized));
  }, []);

  return {
    selectedCard,
    grid,
    selectCard,
    placeCard,
    clearSelection,
    updateHypnotized,
  };
}

