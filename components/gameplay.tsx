"use client";

import { useState } from "react";
import { OpponentHand } from "@/components/opponent-hand";
import { GameField } from "@/components/game-field";
import { PlayerHand } from "@/components/player-hand";
import { useCardPlacement } from "@/hooks/use-card-placement";
import type { GameState } from "@/actions/game-actions";
import type { Card as CardType } from "@/lib/card-types";

type GameplayProps = {
  gameState: GameState;
  currentUserId: number;
};

// TODO: Remove
const testCards: CardType[] = [
  {
    name: "Basic Duck",
    image: "/file.svg",
    effect: [],
    deck: "duck",
    type: "creature",
    isBasic: true,
  },
  {
    name: "Fire Demon",
    image: "/file.svg",
    effect: ["destroy"],
    deck: "demon",
    type: "creature",
    isBasic: false,
  },
  {
    name: "Magic Shield",
    image: "/file.svg",
    effect: ["repel"],
    deck: "duck",
    type: "magic",
  },
  {
    name: "Lightning Bolt",
    image: "/file.svg",
    effect: ["destroy", "draw1"],
    deck: "demon",
    type: "instant",
  },
  {
    name: "Special Duck",
    image: "/file.svg",
    effect: ["draw2", "summon"],
    deck: "duck",
    type: "creature",
    isBasic: false,
  },
  {
    name: "Dark Ritual",
    image: "/file.svg",
    effect: ["draw3"],
    deck: "demon",
    type: "magic",
  },
];

export function Gameplay({ gameState, currentUserId }: GameplayProps) {
  const opponent = gameState.players.find(
    (player) => player.userId !== currentUserId
  );

  const { selectedCard, grid, selectCard, placeCard } = useCardPlacement();
  const [hand, setHand] = useState<CardType[]>(testCards);

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
    <div className="flex flex-col h-full w-full">
      {/* Opponent Hand - Top */}
      <div className="px-4 pt-4">
        <OpponentHand
          handCount={0}
          opponentName={opponent?.user.username}
        />
      </div>

      {/* Game Field - Middle (takes remaining space) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GameField
          grid={grid}
          selectedCard={selectedCard}
          onCardPlace={handleCardPlace}
        />
      </div>

      {/* Player Hand - Bottom */}
      <div className="px-4 pb-4">
        {/* TODO: Remove test cards */}
        <PlayerHand
          hand={hand}
          selectedCard={selectedCard}
          onCardSelect={selectCard}
        />
      </div>
    </div>
  );
}

