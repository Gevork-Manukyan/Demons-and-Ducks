"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameState } from "@/actions/game-actions";

type GameplayProps = {
  gameState: GameState;
  currentUserId: number;
};

export function Gameplay({ gameState, currentUserId }: GameplayProps) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Game in Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">Game Code: {gameState.gameCode}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Players:</p>
            <ul className="space-y-2">
              {gameState.players.map((player) => (
                <li
                  key={player.id}
                  className="text-sm text-zinc-700 bg-zinc-50 px-3 py-2 rounded-md"
                >
                  {player.user.username}
                  {player.userId === currentUserId && " (You)"}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-4">
          <p className="text-sm text-zinc-500 text-center">
            Gameplay logic will be implemented here...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

