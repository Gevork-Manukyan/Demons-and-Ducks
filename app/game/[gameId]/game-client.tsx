"use client";

import { GameWaitingRoom } from "@/components/game-waiting-room";
import { useGameUpdates } from "@/hooks/use-game-updates";
import type { GameState } from "@/actions/game-actions";

type GameClientProps = {
  gameId: number;
  initialGameState: GameState;
  currentUserId: number;
};

export function GameClient({
  gameId,
  initialGameState,
  currentUserId,
}: GameClientProps) {
  const { gameState, isConnected, error } = useGameUpdates(gameId);

  // Use real-time state if available, otherwise fall back to initial state
  const currentState = gameState || initialGameState;

  return (
    <GameWaitingRoom
      gameCode={currentState.gameCode}
      players={currentState.players}
      currentUserId={currentUserId}
      isConnected={isConnected}
      error={error}
    />
  );
}

