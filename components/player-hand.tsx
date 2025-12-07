"use client";

import { GameCard } from "@/components/game-card";
import type { Card } from "@/lib/card-types";

type PlayerHandProps = {
  hand: Card[];
  selectedCard: Card | null;
  onCardSelect: (card: Card | null) => void;
  isAwakenMode?: boolean;
  selectedDiscardCards?: number[];
  onDiscardCardSelect?: (cardId: number) => void;
  canSelectCreature?: boolean;
  canPlayMagic?: boolean;
};

export function PlayerHand({ 
  hand, 
  selectedCard, 
  onCardSelect,
  isAwakenMode = false,
  selectedDiscardCards = [],
  onDiscardCardSelect,
  canSelectCreature = true,
  canPlayMagic = true,
}: PlayerHandProps) {
  return (
    <div className="w-full">
      {isAwakenMode && (
        <div className="text-sm text-center mb-2 p-2 bg-purple-50 rounded">
          Select 2 cards to discard for awakening ({selectedDiscardCards.length}/2)
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto p-2">
        {hand.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center w-full">
            No cards in hand
          </p>
        ) : (
          hand.map((card, index) => {
            const isSelected = selectedCard !== null && selectedCard.id === card.id;
            const isDiscardSelected = isAwakenMode && selectedDiscardCards.includes(card.id);
            const isCreature = card.type === "creature";
            const isMagicOrInstant = card.type === "magic" || card.type === "instant";
            const isDisabled = (isCreature && !canSelectCreature) || (isMagicOrInstant && !canPlayMagic);
            
            return (
              <div
                key={index}
                className={`relative ${
                  isDiscardSelected ? "ring-4 ring-purple-500" : ""
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <GameCard
                  card={card}
                  isSelected={isSelected && !isAwakenMode}
                  onClick={() => {
                    if (isDisabled && !isAwakenMode) {
                      return;
                    }
                    if (isAwakenMode && onDiscardCardSelect) {
                      onDiscardCardSelect(card.id);
                    } else {
                      onCardSelect(isSelected ? null : card);
                    }
                  }}
                />
                {isDiscardSelected && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-1 rounded">
                    Discard
                  </div>
                )}
                {isDisabled && !isAwakenMode && (
                  <div className="absolute inset-0 bg-black bg-opacity-30 rounded flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">Disabled</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

