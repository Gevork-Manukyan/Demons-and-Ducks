"use client";

import { useState } from "react";
import { GameWaitingRoom } from "@/components/game-waiting-room";
import { Gameplay } from "@/components/gameplay";
import { useGameUpdates } from "@/hooks/use-game-updates";
import { markPlayerReady } from "@/actions/game-actions";
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
  const [isReadyLoading, setIsReadyLoading] = useState(false);

  // Use real-time state if available, otherwise fall back to initial state
  const currentState = gameState || initialGameState;
  const gameStatus = currentState.status || "WAITING";

  const handleReadyToggle = async () => {
    const currentPlayer = currentState.players.find(
      (p) => p.userId === currentUserId
    );
    const newReadyState = !(currentPlayer?.readyToStart ?? false);

    setIsReadyLoading(true);
    try {
      await markPlayerReady(gameId, newReadyState);
    } catch (err) {
      console.error("Failed to update ready status:", err);
    } finally {
      setIsReadyLoading(false);
    }
  };

  if (gameStatus === "IN_PROGRESS") {
    return (
      <div className="h-full w-full">
        <Gameplay gameState={currentState} currentUserId={currentUserId} />
      </div>
    );
  }

  return (
    <GameWaitingRoom
      gameCode={currentState.gameCode}
      players={currentState.players}
      currentUserId={currentUserId}
      isConnected={isConnected}
      error={error}
      onReadyToggle={handleReadyToggle}
      isReadyLoading={isReadyLoading}
    />
  );
}

