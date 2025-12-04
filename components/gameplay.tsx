"use client";

import { useState, useEffect } from "react";
import { OpponentHand } from "@/components/opponent-hand";
import { GameField } from "@/components/game-field";
import { PlayerHand } from "@/components/player-hand";
import { useCardPlacement } from "@/hooks/use-card-placement";
import { getPlayerHand, getOpponentHandCount } from "@/actions/game-actions";
import { isActionSuccess } from "@/lib/errors";
import type { GameState } from "@/actions/game-actions";
import type { Card as CardType } from "@/lib/card-types";

type GameplayProps = {
  gameState: GameState;
  currentUserId: number;
  gameId: number;
  initialHand: CardType[];
  initialOpponentHandCount: number;
};

export function Gameplay({ gameState, currentUserId, gameId, initialHand, initialOpponentHandCount }: GameplayProps) {
  const opponent = gameState.players.find(
    (player) => player.userId !== currentUserId
  );

  const { selectedCard, grid, selectCard, placeCard } = useCardPlacement();
  const [hand, setHand] = useState<CardType[]>(initialHand);
  const [opponentHandCount, setOpponentHandCount] = useState<number>(initialOpponentHandCount);

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

  const handleCardPlace = (card: CardType, row: number, col: number) => {
    
    setHand((currentHand) => {
      const cardIndex = currentHand.findIndex(
        (c) =>
          c.name === card.name &&
          c.deck === card.deck &&
          c.type === card.type
      );
      if (cardIndex !== -1) {
        placeCard(card, row, col);
        return currentHand.filter((_, index) => index !== cardIndex);
      }
      return currentHand;
    });
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

