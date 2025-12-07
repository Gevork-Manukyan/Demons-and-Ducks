"use client";

import { useState, useEffect, useRef } from "react";
import { OpponentHand } from "@/components/opponent-hand";
import { GameField } from "@/components/game-field";
import { PlayerHand } from "@/components/player-hand";
import { useCardPlacement } from "@/hooks/use-card-placement";
import { getPlayerHand, getOpponentHandCount, getPlayerHandCardIds, placeCardOnField, updateCardHypnotizedState, createCardIdToCardMap } from "@/actions/game-actions";
import { isActionSuccess, isActionError } from "@/lib/errors";
import type { GameState } from "@/actions/game-actions";
import type { Card as CardType } from "@/lib/card-types";
import { databaseFormatToGrid, createEmptyGrid, updateGridValidPositions } from "@/lib/game-field-utils";
import type { GameGrid } from "@/lib/game-field-utils";

type GameplayProps = {
  gameState: GameState;
  currentUserId: number;
  gameId: number;
  initialHand: CardType[];
  initialOpponentHandCount: number;
  initialGrid?: GameGrid;
};

export function Gameplay({ gameState, currentUserId, gameId, initialHand, initialOpponentHandCount, initialGrid }: GameplayProps) {
  const opponent = gameState.players.find(
    (player) => player.userId !== currentUserId
  );

  const { selectedCard, grid, selectCard, placeCard, updateHypnotized, updateGrid } = useCardPlacement(initialGrid);
  const [hand, setHand] = useState<CardType[]>(initialHand);
  const [opponentHandCount, setOpponentHandCount] = useState<number>(initialOpponentHandCount);
  const lastGridDataRef = useRef<string | null>(null);

  // Fetch hand and opponent hand count when game status becomes IN_PROGRESS
  useEffect(() => {
    if (gameState.status === "IN_PROGRESS" && hand.length === 0) {
      const fetchHand = async () => {
        const handResult = await getPlayerHand(gameId);
        if (isActionSuccess(handResult)) {
          setHand(handResult.data);
        } else {
          console.error("Failed to fetch hand:", handResult.error);
        }
      };

      const fetchOpponentHandCount = async () => {
        const countResult = await getOpponentHandCount(gameId);
        if (isActionSuccess(countResult)) {
          setOpponentHandCount(countResult.data);
        } else {
          console.error("Failed to fetch opponent hand count:", countResult.error);
        }
      };

      fetchHand();
      fetchOpponentHandCount();
    }
  }, [gameState.status, gameId, hand.length]);

  // Listen for grid updates from server
  useEffect(() => {
    const currentGridDataString = JSON.stringify(gameState.gridData);
    
    if (currentGridDataString !== lastGridDataRef.current) {
      lastGridDataRef.current = currentGridDataString;

      const updateGridFromServer = async () => {
        try {
          // If there's grid data, convert it and update the grid
          if (gameState.gridData && gameState.gridData.length > 0) {
            const cardIdToCardMap = await createCardIdToCardMap(gameState.gridData);
            const newGrid = databaseFormatToGrid(gameState.gridData, cardIdToCardMap);
            updateGrid(newGrid);
          } else {
            const emptyGrid = updateGridValidPositions(createEmptyGrid());
            updateGrid(emptyGrid);
          }
        } catch (error) {
          console.error("Failed to update grid from server:", error);
        }
      };

      updateGridFromServer();
    }
  }, [gameState.gridData, updateGrid]);

  const handleCardPlace = async (card: CardType, row: number, col: number) => {
    const cardIndex = hand.findIndex(
      (c) =>
        c.name === card.name &&
        c.deck === card.deck &&
        c.type === card.type &&
        (c.type !== "creature" || 
         (c.type === "creature" && card.type === "creature" && c.isBasic === card.isBasic))
    );

    if (cardIndex === -1) {
      console.error("Card not found in hand");
      return;
    }

    // Fetch hand card IDs to get the card ID for this card
    const handIdsResult = await getPlayerHandCardIds(gameId);
    if (!isActionSuccess(handIdsResult)) {
      console.error("Failed to fetch hand card IDs:", handIdsResult.error);
      return;
    }

    const handCardIds = handIdsResult.data;
    if (cardIndex >= handCardIds.length) {
      console.error("Card index out of bounds");
      return;
    }

    const cardId = handCardIds[cardIndex];

    // Call server action to place card
    const result = await placeCardOnField(gameId, cardId, row, col);
    
    if (isActionError(result)) {
      console.error("Failed to place card:", result.message);
      return;
    }

    // Update local state only if server action succeeds
    placeCard(card, row, col);
    setHand((currentHand) => currentHand.filter((_, index) => index !== cardIndex));
  };

  const handleHypnotizedUpdate = async (row: number, col: number, hypnotized: boolean) => {
    const result = await updateCardHypnotizedState(gameId, row, col, hypnotized);
    
    if (isActionError(result)) {
      console.error("Failed to update hypnotized state:", result.message);
      return;
    }

    updateHypnotized(row, col, hypnotized);
  };

  return (
    <div className="flex flex-row h-full w-full">
      {/* Left Side - Game Field (50%) */}
      <div className="w-1/2 h-full min-h-0 overflow-hidden">
        <GameField
          grid={grid}
          selectedCard={selectedCard}
          onCardPlace={handleCardPlace}
        />
      </div>

      {/* Right Side - Hands (50%) */}
      <div className="w-1/2 h-full flex flex-col">
        {/* Opponent Hand - Top */}
        <div className="px-4 pt-4">
          <OpponentHand
            handCount={opponentHandCount}
            opponentName={opponent?.user.username}
          />
        </div>

        {/* Info Section */}
        <div className="flex-1"> 

        </div>

        {/* Player Hand - Bottom (takes remaining space) */}
        <div className="px-4 pb-4 min-h-0 overflow-hidden">
          <PlayerHand
            hand={hand}
            selectedCard={selectedCard}
            onCardSelect={selectCard}
          />
        </div>
      </div>
    </div>
  );
}

