"use client";

import { useLobbyContext } from "@/contexts/LobbyContext";
import { ErrorMessage } from "../error/error-message";
import { EmptyState } from "./empty-state";
import { GameCard } from "./game-card/game-card";
import { LoadingScreen } from "../loading/loading-screen";
import { ActiveGames } from "./active-games";

export function JoinableGames() {
    const { error, currentGames, isJoining, refreshGames } = useLobbyContext();
    const placeholderActiveGames: Array<{ gameId: string }> = [];

    return (
        <>
            <ActiveGames activeGames={placeholderActiveGames} />
            <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Available Games
                    </h2>
                    <button
                        type="button"
                        className="text-sm text-indigo-600 hover:underline"
                        onClick={() => refreshGames()}
                    >
                        Refresh
                    </button>
                </div>
                {error ? (
                    <ErrorMessage message={error} />
                ) : currentGames.length === 0 ? (
                    <EmptyState />
                ) : isJoining ? (
                    <LoadingScreen message="Joining game..." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentGames.map((game) => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
