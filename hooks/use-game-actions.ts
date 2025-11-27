import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createGame, joinGame } from "@/actions/game-actions";

export function useGameActions() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [createdGameCode, setCreatedGameCode] = useState<string | null>(null);
  const [createdGameId, setCreatedGameId] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joinState, joinFormAction] = useFormState(joinGame, null);

  const handleCreateGame = async () => {
    setIsCreating(true);
    setCreateError(null);
    setCreatedGameCode(null);
    setCreatedGameId(null);

    const result = await createGame();

    setIsCreating(false);

    if (result.error) {
      setCreateError(result.error);
    } else if (result.success && result.gameCode && result.gameId) {
      setCreatedGameCode(result.gameCode);
      setCreatedGameId(result.gameId);
      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(result.gameCode);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleCopyCode = async () => {
    if (createdGameCode) {
      try {
        await navigator.clipboard.writeText(createdGameCode);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleGoToGame = () => {
    if (createdGameId) {
      router.push(`/game/${createdGameId}`);
    }
  };

  // Handle join game redirect
  useEffect(() => {
    if (joinState?.success && joinState.gameId) {
      router.push(`/game/${joinState.gameId}`);
    }
  }, [joinState, router]);

  return {
    // State
    gameCode,
    createdGameCode,
    createdGameId,
    createError,
    isCreating,
    joinState,
    // Actions
    setGameCode,
    handleCreateGame,
    handleCopyCode,
    handleGoToGame,
    joinFormAction,
  };
}

