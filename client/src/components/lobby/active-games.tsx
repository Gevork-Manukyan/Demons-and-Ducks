"use client";

interface ActiveGamesProps {
    activeGames: Array<{ gameId: string }>;
}

export function ActiveGames({ activeGames }: ActiveGamesProps) {
    if (activeGames.length === 0) {
        return (
            <div className="bg-blue-50 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-blue-800 mb-2">
                    My Active Games
                </h2>
                <p className="text-blue-600">
                    You are not in any games yet. Once you add real matchmaking,
                    they will show up here.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-blue-50 rounded-xl shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-6">
                My Active Games ({activeGames.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGames.map((userGame) => (
                    <div
                        key={userGame.gameId}
                        className="bg-white rounded-lg p-4 border border-blue-200"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-gray-800">
                                    Game {userGame.gameId.slice(-6)}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Hook up navigation when the new game client
                                    is ready.
                                </p>
                            </div>
                            <span className="text-blue-600 text-sm">
                                Coming soon
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
