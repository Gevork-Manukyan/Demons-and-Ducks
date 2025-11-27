"use client";

import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGameActions } from "@/hooks/use-game-actions";
import { getErrorMessage } from "@/lib/error-utils";

export default function LobbyPage() {
  const {
    gameCode,
    createdGameCode,
    createdGameId,
    createError,
    isCreating,
    joinState,
    setGameCode,
    handleCreateGame,
    handleCopyCode,
    handleGoToGame,
    joinFormAction,
  } = useGameActions();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-900">Demons and Ducks</h1>
        <SignOutButton />
      </nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-6 py-16">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-6 pt-6">
            {/* Create game button */}
            <div className="space-y-4">
              <Button
                onClick={handleCreateGame}
                className="w-full"
                size="lg"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create game"}
              </Button>

              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              {createdGameCode && createdGameId && (
                <div className="space-y-2">
                  <Label>Game code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdGameCode}
                      readOnly
                      className="flex-1 font-mono"
                    />
                    <Button onClick={handleCopyCode} variant="outline">
                      Copy
                    </Button>
                  </div>
                  <Button
                    onClick={handleGoToGame}
                    className="w-full"
                    size="lg"
                  >
                    Go to Game
                  </Button>
                </div>
              )}
            </div>

            {/* Join game section */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-zinc-500">Or</span>
                </div>
              </div>

              <form action={joinFormAction} className="space-y-2">
                <Label htmlFor="gameCode">Game code</Label>
                <div className="flex gap-2">
                  <Input
                    id="gameCode"
                    name="gameCode"
                    placeholder="Enter game code"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!gameCode.trim()}>
                    Join
                  </Button>
                </div>
                {getErrorMessage(joinState) && (
                  <Alert variant="destructive">
                    <AlertDescription>{getErrorMessage(joinState)}</AlertDescription>
                  </Alert>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

