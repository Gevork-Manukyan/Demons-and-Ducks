"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OpponentHandProps = {
  handCount?: number;
  hand?: unknown[];
  opponentName?: string;
};

export function OpponentHand({
  handCount,
  hand
}: OpponentHandProps) {
  const count = handCount ?? hand?.length ?? 0;

  return (
    <div className="w-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="shrink-0 w-20 h-28 bg-linear-to-br from-zinc-600 to-zinc-800 border-2 border-zinc-700 rounded-lg shadow-md flex items-center justify-center cursor-pointer">
            <div className="w-12 h-16 bg-zinc-900 rounded border-2 border-zinc-600"></div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} cards</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

