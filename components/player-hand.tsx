"use client";

import { GameCard } from "@/components/game-card";
import type { Card } from "@/lib/card-types";

type PlayerHandProps = {
  hand: Card[];
  selectedCard: Card | null;
  onCardSelect: (card: Card | null) => void;
};

export function PlayerHand({ hand, selectedCard, onCardSelect }: PlayerHandProps) {
  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto p-2">
        {hand.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center w-full">
            No cards in hand
          </p>
        ) : (
          hand.map((card, index) => {
            const isSelected = selectedCard !== null && 
              selectedCard.name === card.name && 
              selectedCard.deck === card.deck &&
              selectedCard.type === card.type;
            
            return (
              <GameCard
                key={index}
                card={card}
                isSelected={isSelected}
                onClick={() => {
                  onCardSelect(isSelected ? null : card);
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

