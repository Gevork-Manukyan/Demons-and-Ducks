"use client";

import { cn } from "@/lib/utils";

type EmptyCardSpaceProps = {
  className?: string;
  onClick?: () => void;
};

export function EmptyCardSpace({ className, onClick }: EmptyCardSpaceProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "w-[120px] h-[168px] rounded-lg border-2 border-dashed border-zinc-400 bg-transparent",
        onClick && "cursor-pointer hover:border-zinc-500 hover:bg-zinc-50/50 transition-colors",
        className
      )}
    />
  );
}

