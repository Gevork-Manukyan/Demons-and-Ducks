"use client";

import { useState, useEffect, useRef } from "react";
import { OpponentHand } from "@/components/opponent-hand";
import { GameField } from "@/components/game-field";
import { PlayerHand } from "@/components/player-hand";
import { useCardPlacement } from "@/hooks/use-card-placement";
import { getPlayerHand, getOpponentHandCount, placeCardOnField, updateCardHypnotizedState, createCardIdToCardMap, playMagicOrInstantCard, findCardIdInHand } from "@/actions/game-actions";
import { isActionSuccess, isActionError } from "@/lib/errors";
import type { GameState } from "@/actions/game-actions";
import type { Card as CardType } from "@/lib/card-types";
import { databaseFormatToGrid, createEmptyGrid, updateGridValidPositions } from "@/lib/game-field-utils";
import type { GameGrid } from "@/lib/game-field-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const { selectedCard, grid, selectCard, placeCard, updateHypnotized, updateGrid, clearSelection } = useCardPlacement(initialGrid);
  const [hand, setHand] = useState<CardType[]>(initialHand);
  const [opponentHandCount, setOpponentHandCount] = useState<number>(initialOpponentHandCount);
  const lastGridDataRef = useRef<string | null>(null);
  const cardToConfirm = selectedCard && (selectedCard.type === "magic" || selectedCard.type === "instant") ? selectedCard : null;

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
    if (card.type !== "creature") {
      return;
    }

    // Find the card ID by matching properties
    const cardIdResult = await findCardIdInHand(
      gameId,
      card.name,
      card.deck,
      card.type,
      card.isBasic
    );

    if (!isActionSuccess(cardIdResult)) {
      console.error("Failed to find card ID:", cardIdResult.error);
      return;
    }

    const cardId = cardIdResult.data;
    if (cardId === null) {
      console.error("Card not found in hand");
      return;
    }

    // Find the card index in the local hand for UI updates
    const cardIndex = hand.findIndex(
      (c) =>
        c.name === card.name &&
        c.deck === card.deck &&
        c.type === card.type &&
        (c.type !== "creature" || 
         (c.type === "creature" && card.type === "creature" && c.isBasic === card.isBasic))
    );

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

  const handleConfirmPlayCard = async () => {
    if (!cardToConfirm) return;

    const cardIdResult = await findCardIdInHand(
      gameId,
      cardToConfirm.name,
      cardToConfirm.deck,
      cardToConfirm.type,
      undefined
    );

    if (!isActionSuccess(cardIdResult)) {
      console.error("Failed to find card ID:", cardIdResult.error);
      clearSelection();
      return;
    }

    const cardId = cardIdResult.data;
    if (cardId === null) {
      console.error("Card not found in hand");
      clearSelection();
      return;
    }

    // Find the card index in the local hand for UI updates
    const cardIndex = hand.findIndex(
      (c) =>
        c.name === cardToConfirm.name &&
        c.deck === cardToConfirm.deck &&
        c.type === cardToConfirm.type
    );

    // Call server action to play card
    const result = await playMagicOrInstantCard(gameId, cardId);
    
    if (isActionError(result)) {
      console.error("Failed to play card:", result.message);
      return;
    }

    // Update local state only if server action succeeds
    setHand((currentHand) => currentHand.filter((_, index) => index !== cardIndex));
    clearSelection();
  };

  const handleCancelPlayCard = () => {
    clearSelection();
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

      {/* Confirmation Dialog for Magic/Instant Cards */}
      <AlertDialog open={cardToConfirm !== null} onOpenChange={(open) => !open && handleCancelPlayCard()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Play {cardToConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This {cardToConfirm?.type} card will be played and moved to your discard pile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPlayCard}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPlayCard}>Play</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

