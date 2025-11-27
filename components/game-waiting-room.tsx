"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Player = {
  id: number;
  userId: number;
  user: {
    id: number;
    username: string;
    name: string | null;
  };
};

type GameWaitingRoomProps = {
  gameCode: string;
  players: Player[];
  currentUserId: number;
};

export function GameWaitingRoom({
  gameCode,
  players,
  currentUserId,
}: GameWaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const canStart = players.length >= 2;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Waiting for Players</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Game Code */}
        <div className="space-y-2">
          <Label>Game Code</Label>
          <div className="flex gap-2">
            <Input
              value={gameCode}
              readOnly
              className="flex-1 font-mono"
            />
            <Button onClick={handleCopyCode} variant="outline">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-2">
          <Label>Players ({players.length}/2)</Label>
          <ul className="space-y-2">
            {players.map((player) => (
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

        {/* Start Button */}
        <div className="pt-2">
          <Button
            className="w-full"
            size="lg"
            disabled={!canStart}
          >
            Start Game
          </Button>
          {!canStart && (
            <p className="text-sm text-zinc-500 text-center mt-2">
              Waiting for another player to join...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

