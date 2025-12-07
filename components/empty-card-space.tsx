"use client";

import { cn } from "@/lib/utils";

type EmptyCardSpaceProps = {
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function EmptyCardSpace({ className, onClick, disabled }: EmptyCardSpaceProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        "w-[120px] h-[168px] rounded-lg border-2 border-dashed border-zinc-400 bg-transparent",
        onClick && !disabled && "cursor-pointer hover:border-zinc-500 hover:bg-zinc-50/50 transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
}

