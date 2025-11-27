import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { createGame, joinGame } from "@/actions/game-actions";
import { isActionError, isActionSuccess } from "@/lib/errors";
import { getErrorMessage } from "@/lib/error-utils";

export function useGameActions() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joinState, joinFormAction] = useActionState(joinGame, null);

  const handleCreateGame = async () => {
    setIsCreating(true);
    setCreateError(null);

    const result = await createGame();

    setIsCreating(false);

    if (isActionError(result)) {
      setCreateError(result.message);
    } else if (isActionSuccess(result)) {
      const { gameId } = result.data;
      // Auto-redirect to game page
      router.push(`/game/${gameId}`);
    }
  };

  // Handle join game redirect
  useEffect(() => {
    if (joinState && isActionSuccess(joinState)) {
      router.push(`/game/${joinState.data.gameId}`);
    }
  }, [joinState, router]);

  return {
    // State
    gameCode,
    createError,
    isCreating,
    joinState,
    // Actions
    setGameCode,
    handleCreateGame,
    joinFormAction,
  };
}

