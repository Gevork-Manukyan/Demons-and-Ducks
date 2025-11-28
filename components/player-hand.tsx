"use client";

type PlayerHandProps = {
  hand: unknown[];
  onCardClick?: (card: unknown, index: number) => void;
};

export function PlayerHand({ hand, onCardClick }: PlayerHandProps) {
  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {hand.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center w-full">
            No cards in hand
          </p>
        ) : (
          hand.map((card, index) => (
            <div
              key={index}
              onClick={() => onCardClick?.(card, index)}
              className="flex-shrink-0 w-20 h-28 bg-zinc-100 border-2 border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 hover:shadow-md transition-all flex items-center justify-center"
            >
              <span className="text-xs text-zinc-600">Card {index + 1}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

