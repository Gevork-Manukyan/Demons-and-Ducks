"use client";

import { Gameplay } from "@/components/gameplay";
import { useGameUpdates } from "@/hooks/use-game-updates";
import type { GameState } from "@/actions/game-actions";
import type { Card } from "@/lib/card-types";
import type { GameGrid } from "@/lib/game-field-utils";

type GameplayClientProps = {
  gameId: number;
  initialGameState: GameState;
  currentUserId: number;
  initialHand: Card[];
  initialOpponentHandCount: number;
  initialGrid?: GameGrid;
};

export function GameplayClient({
  gameId,
  initialGameState,
  currentUserId,
  initialHand,
  initialOpponentHandCount,
  initialGrid,
}: GameplayClientProps) {
  const { gameState } = useGameUpdates(gameId);
  const currentState = gameState || initialGameState;

  return (
    <div className="h-full w-full">
      <Gameplay 
        gameState={currentState} 
        currentUserId={currentUserId}
        gameId={gameId}
        initialHand={initialHand}
        initialOpponentHandCount={initialOpponentHandCount}
        initialGrid={initialGrid}
      />
    </div>
  );
}
