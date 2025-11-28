"use client";

import { Card, CardContent } from "@/components/ui/card";
import { OpponentHand } from "@/components/opponent-hand";
import { GameField } from "@/components/game-field";
import { PlayerHand } from "@/components/player-hand";
import type { GameState } from "@/actions/game-actions";

type GameplayProps = {
  gameState: GameState;
  currentUserId: number;
};

export function Gameplay({ gameState, currentUserId }: GameplayProps) {
  const opponent = gameState.players.find(
    (player) => player.userId !== currentUserId
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Opponent Hand - Top */}
          <div>
            <OpponentHand
              handCount={0}
              opponentName={opponent?.user.username}
            />
          </div>

          {/* Game Field - Middle */}
          <div>
            <GameField />
          </div>

          {/* Player Hand - Bottom */}
          <div>
            <PlayerHand hand={[]} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

