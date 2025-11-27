"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameState } from "@/actions/game-actions";

type GameWaitingRoomProps = {
  gameCode: string;
  players: GameState["players"];
  currentUserId: number;
  isConnected?: boolean;
  error?: string | null;
};

export function GameWaitingRoom({
  gameCode,
  players,
  currentUserId,
  isConnected,
  error,
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
          <div className="flex items-center justify-between">
            <Label>Players ({players.length}/2)</Label>
            {isConnected !== undefined && (
              <span
                className={`text-xs ${
                  isConnected ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {isConnected ? "● Connected" : "● Connecting..."}
              </span>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
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

