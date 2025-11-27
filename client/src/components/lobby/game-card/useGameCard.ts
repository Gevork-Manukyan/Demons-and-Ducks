"use client";

import { useState } from "react";
import { LobbyGame, useLobbyContext } from "@/contexts/LobbyContext";

export function useGameCard(game: LobbyGame) {
    const { setIsJoining } = useLobbyContext();
    const [isJoiningGame, setIsJoiningGame] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleJoinClick = () => {
        setIsJoining(true);
        setIsJoiningGame(true);
        setStatusMessage("Connecting to placeholder lobby...");

        setTimeout(() => {
            setStatusMessage(
                `You joined ${game.gameName}. Replace this with real routing when ready.`
            );
            setIsJoining(false);
            setIsJoiningGame(false);
        }, 800);
    };

    return {
        handleJoinClick,
        isJoiningGame,
        statusMessage,
    };
}
