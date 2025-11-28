"use client";

type GameFieldProps = {
  field?: unknown;
  cardGrid?: unknown;
};

export function GameField({ field, cardGrid }: GameFieldProps) {
  const gridData = cardGrid ?? field;

  return (
    <div className="w-full min-h-[200px] bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-lg p-4">
      <div className="flex items-center justify-center h-full min-h-[200px]">
        {gridData ? (
          <p className="text-sm text-zinc-500">
            Field content will be displayed here
          </p>
        ) : (
          <p className="text-sm text-zinc-400 text-center">
            Playing field - cards will appear here
          </p>
        )}
      </div>
    </div>
  );
}

