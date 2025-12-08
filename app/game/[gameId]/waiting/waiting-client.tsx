"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GameWaitingRoom } from "@/components/game-waiting-room";
import { useGameUpdates } from "@/hooks/use-game-updates";
import { markPlayerReady } from "@/actions/game-actions";

type Player = {
  id: number;
  userId: number;
  readyToStart: boolean;
  user: {
    id: number;
    username: string;
  };
};

type WaitingClientProps = {
  gameId: number;
  gameCode: string;
  status: string;
  players: Player[];
  currentUserId: number;
};

export function WaitingClient({
  gameId,
  gameCode: initialGameCode,
  status: initialStatus,
  players: initialPlayers,
  currentUserId,
}: WaitingClientProps) {
  const router = useRouter();
  const { gameState, isConnected, error } = useGameUpdates(gameId);
  const [isReadyLoading, setIsReadyLoading] = useState(false);
  
  // Use real-time state if available, otherwise fall back to initial props
  const gameCode = gameState?.gameCode ?? initialGameCode;
  const status = gameState?.status ?? initialStatus;
  const players = gameState?.players ?? initialPlayers;
  const gameStatus = status || "WAITING";

  // Auto-redirect to game route when game starts
  useEffect(() => {
    if (gameStatus === "IN_PROGRESS" || gameStatus === "COMPLETED") {
      router.push(`/game/${gameId}/play`);
    }
  }, [gameStatus, gameId, router]);

  const handleReadyToggle = async () => {
    const currentPlayer = players.find(
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

  return (
    <GameWaitingRoom
      gameCode={gameCode}
      players={players}
      currentUserId={currentUserId}
      isConnected={isConnected}
      error={error}
      onReadyToggle={handleReadyToggle}
      isReadyLoading={isReadyLoading}
    />
  );
}
