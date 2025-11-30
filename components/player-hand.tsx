"use client";

import { GameCard } from "@/components/game-card";
import type { Card } from "@/lib/card-types";

type PlayerHandProps = {
  hand: Card[];
  onCardClick?: (card: Card, index: number) => void;
};

export function PlayerHand({ hand, onCardClick }: PlayerHandProps) {
  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto p-2">
        {hand.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center w-full">
            No cards in hand
          </p>
        ) : (
          hand.map((card, index) => (
            <GameCard
              key={index}
              card={card}
              onClick={() => onCardClick?.(card, index)}
            />
          ))
        )}
      </div>
    </div>
  );
}

