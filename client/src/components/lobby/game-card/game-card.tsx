"use client";

import { LobbyGame } from "@/contexts/LobbyContext";
import { useGameCard } from "./useGameCard";

type GameCardProps = {
    game: LobbyGame;
};

export function GameCard({ game }: GameCardProps) {
    const { handleJoinClick, isJoiningGame, statusMessage } = useGameCard(game);
    const shortGameId = game.id.toString().slice(-6);

    return (
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="font-mono bg-gray-100 px-3 py-1 rounded text-gray-700">
                            #{shortGameId}
                        </span>
                        <span className="text-sm text-gray-500">
                            {game.isPrivate ? "🔒 Private" : "🔓 Public"}
                        </span>
                    </div>
                    <span className="text-sm text-gray-500">
                        {game.numCurrentPlayers}/{game.numPlayersTotal} players
                    </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                    {game.gameName}
                </h3>
            </div>
            <button
                onClick={handleJoinClick}
                disabled={isJoiningGame}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
            >
                {isJoiningGame ? "Joining..." : "Join Game"}
            </button>
            {statusMessage && (
                <p className="mt-2 text-sm text-gray-500">{statusMessage}</p>
            )}
        </div>
    );
}
