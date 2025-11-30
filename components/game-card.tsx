"use client";

import Image from "next/image";
import type { Card } from "@/lib/card-types";
import { cn } from "@/lib/utils";

type GameCardProps = {
  card: Card;
  onClick?: () => void;
  className?: string;
};

export function GameCard({ card, onClick, className }: GameCardProps) {
  const isDuck = card.deck === "duck";
  const isCreature = card.type === "creature";
  const hasEffect = card.effect.length > 0;
  const isBasic = isCreature && card.isBasic;

  return (
    <div
      onClick={onClick}
      className={cn(
        "shrink-0 w-40 h-56 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all flex flex-col overflow-hidden",
        isDuck ? "bg-blue-50 border-blue-300" : "bg-red-50 border-red-300",
        onClick && "hover:scale-105",
        className
      )}
    >
      {/* Top section: Name and Special/Basic - fixed height */}
      <div className="h-16 flex flex-col justify-center px-1.5 border-b border-zinc-300">
        <p className="text-sm font-semibold leading-tight truncate">
          {card.name}
        </p>
        {isCreature && (
          <p className="text-xs text-zinc-600 leading-tight">
            {isBasic ? "Basic" : "Special"} {isDuck ? "Duck" : "Demon"}
          </p>
        )}
      </div>

      {/* Middle section: Image - flexible height */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center bg-zinc-100 relative",
          !hasEffect && "flex-1"
        )}
      >
        {card.image ? (
          <Image
            src={card.image}
            alt={card.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
            <span className="text-xs text-zinc-400">Image</span>
          </div>
        )}
      </div>

      {/* Bottom section: Effect - fixed height (same as top) */}
      {hasEffect && (
        <div className="h-16 flex items-center justify-center px-1.5 border-t border-zinc-300 bg-zinc-50">
          <p className="text-xs text-zinc-700 text-center leading-tight line-clamp-2">
            {card.effect.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

