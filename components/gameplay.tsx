"use client";

import { useState, useEffect, useRef } from "react";
import { OpponentHand } from "@/components/opponent-hand";
import { GameField } from "@/components/game-field";
import { PlayerHand } from "@/components/player-hand";
import { useCardPlacement } from "@/hooks/use-card-placement";
import { 
  getPlayerHand, 
  placeCardOnField, 
  createCardIdToCardMap, 
  playMagicOrInstantCard,
  drawCard,
  awakenCard,
  skipAwaken,
  drawCardInActionPhase,
  endActionPhase,
  getAvailableThreeInARows,
  scoreThreeInARow,
  endTurn,
} from "@/actions/game-actions";
import { isActionSuccess, isActionError } from "@/lib/errors";
import type { GameState } from "@/actions/game-actions";
import type { Card as CardType } from "@/lib/card-types";
import { databaseFormatToGrid, createEmptyGrid, updateGridValidPositions } from "@/lib/game-field-utils";
import type { GameGrid } from "@/lib/game-field-utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type GameplayProps = {
  gameState: GameState;
  currentUserId: number;
  gameId: number;
  initialHand: CardType[];
  initialOpponentHandCount: number;
  initialGrid?: GameGrid;
};

export function Gameplay({ gameState, currentUserId, gameId, initialHand, initialOpponentHandCount, initialGrid }: GameplayProps) {
  const opponent = gameState.players.find(
    (player) => player.userId !== currentUserId
  );
  const currentPlayer = gameState.players.find(
    (player) => player.userId === currentUserId
  );

  const { selectedCard, grid, selectCard, placeCard, updateGrid, clearSelection } = useCardPlacement(initialGrid);
  const [hand, setHand] = useState<CardType[]>(initialHand);
  const lastGridDataRef = useRef<string | null>(null);
  const cardToConfirm = selectedCard && (selectedCard.type === "magic" || selectedCard.type === "instant") ? selectedCard : null;
  const opponentHandCount = gameState.opponentHandCount ?? initialOpponentHandCount;
  const [availableThreeInARows, setAvailableThreeInARows] = useState<Array<Array<{row: number, col: number}>>>([]);
  const [selectedThreeInARow, setSelectedThreeInARow] = useState<Array<{row: number, col: number}> | null>(null);
  const [selectedHypnotizedCard, setSelectedHypnotizedCard] = useState<{row: number, col: number} | null>(null);
  const [selectedDiscardCards, setSelectedDiscardCards] = useState<number[]>([]);

  const isMyTurn = currentPlayer && gameState.currentTurnPlayerId === currentPlayer.id;
  const currentPhase = gameState.currentPhase;
  const isAwakenPhase = currentPhase === "AWAKEN" && isMyTurn;

  // Fetch hand when game status becomes IN_PROGRESS
  useEffect(() => {
    if (gameState.status === "IN_PROGRESS" && hand.length === 0) {
      const fetchHand = async () => {
        const handResult = await getPlayerHand(gameId);
        if (isActionSuccess(handResult)) {
          setHand(handResult.data);
        } else {
          console.error("Failed to fetch hand:", handResult.error);
        }
      };

      fetchHand();
    }
  }, [gameState.status, gameId, hand.length]);

  // Listen for grid updates from server
  useEffect(() => {
    const currentGridDataString = JSON.stringify(gameState.gridData);
    
    if (currentGridDataString !== lastGridDataRef.current) {
      lastGridDataRef.current = currentGridDataString;

      const updateGridFromServer = async () => {
        try {
          // If there's grid data, convert it and update the grid
          if (gameState.gridData && gameState.gridData.length > 0) {
            const cardIdToCardMap = await createCardIdToCardMap(gameState.gridData);
            const newGrid = databaseFormatToGrid(gameState.gridData, cardIdToCardMap);
            updateGrid(newGrid);
          } else {
            const emptyGrid = updateGridValidPositions(createEmptyGrid());
            updateGrid(emptyGrid);
          }
        } catch (error) {
          console.error("Failed to update grid from server:", error);
        }
      };

      updateGridFromServer();
    }
  }, [gameState.gridData, updateGrid]);

  // Fetch available three-in-a-rows when in SCORING phase
  useEffect(() => {
    if (currentPhase === "SCORING" && isMyTurn) {
      const fetchThreeInARows = async () => {
        const result = await getAvailableThreeInARows(gameId);
        if (isActionSuccess(result)) {
          setAvailableThreeInARows(result.data);
        }
      };
      fetchThreeInARows();
    }
    
    return () => {
      setAvailableThreeInARows([]);
      setSelectedThreeInARow(null);
    };
  }, [currentPhase, isMyTurn, gameId]);

  // Reset awaken selections when phase changes away from AWAKEN
  const prevPhaseRef = useRef(currentPhase);
  useEffect(() => {
    const wasAwaken = prevPhaseRef.current === "AWAKEN";
    const isAwaken = currentPhase === "AWAKEN";
    
    if (wasAwaken && !isAwaken) {
      // Reset state when leaving AWAKEN phase - use cleanup to avoid sync setState
      const timeoutId = setTimeout(() => {
        setSelectedHypnotizedCard(null);
        setSelectedDiscardCards([]);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    prevPhaseRef.current = currentPhase;
  }, [currentPhase]);

  const handleCardPlace = async (card: CardType, row: number, col: number) => {
    if (card.type !== "creature") {
      return;
    }

    if (!currentPlayer) {
      console.error("Current player not found");
      return;
    }

    // Update local state only if server action succeeds
    const result = await placeCardOnField(gameId, card.id, row, col);
    
    if (isActionError(result)) {
      console.error("Failed to place card:", result.message);
      return;
    }

    placeCard(card, row, col, currentPlayer.id);

    // Find the card index in the local hand for UI updates
    const cardIndex = hand.findIndex((c) => c.id === card.id);
    setHand((currentHand) => currentHand.filter((_, index) => index !== cardIndex));
  };

  const handleConfirmPlayCard = async () => {
    if (!cardToConfirm) return;

    // Find the card index in the local hand for UI updates
    const cardIndex = hand.findIndex((c) => c.id === cardToConfirm.id);

    // Call server action to play card
    const result = await playMagicOrInstantCard(gameId, cardToConfirm.id);
    
    if (isActionError(result)) {
      console.error("Failed to play card:", result.message);
      return;
    }

    // Update local state only if server action succeeds
    setHand((currentHand) => currentHand.filter((_, index) => index !== cardIndex));
    clearSelection();
  };

  const handleCancelPlayCard = () => {
    clearSelection();
  };

  const handleDrawCard = async () => {
    const result = await drawCard(gameId);
    if (isActionError(result)) {
      console.error("Failed to draw card:", result.message);
    }
  };

  const handleSkipAwaken = async () => {
    const result = await skipAwaken(gameId);
    if (isActionError(result)) {
      console.error("Failed to skip awaken:", result.message);
    }
  };

  const handleHypnotizedCardSelect = (row: number, col: number) => {
    if (isAwakenPhase) {
      if (selectedHypnotizedCard?.row === row && selectedHypnotizedCard?.col === col) {
        setSelectedHypnotizedCard(null);
      } else {
        setSelectedHypnotizedCard({ row, col });
      }
    }
  };

  const handleDiscardCardSelect = (cardId: number) => {
    if (!isAwakenPhase) return;
    
    setSelectedDiscardCards((current) => {
      if (current.includes(cardId)) {
        // Deselect if already selected
        return current.filter((id) => id !== cardId);
      } else if (current.length < 2) {
        // Add if less than 2 selected
        return [...current, cardId];
      }
      // Already have 2, don't add more
      return current;
    });
  };

  const handleAwaken = async () => {
    if (!selectedHypnotizedCard || selectedDiscardCards.length !== 2) {
      return;
    }

    const result = await awakenCard(
      gameId,
      selectedHypnotizedCard.row,
      selectedHypnotizedCard.col,
      [selectedDiscardCards[0], selectedDiscardCards[1]] as [number, number]
    );

    if (isActionError(result)) {
      console.error("Failed to awaken card:", result.message);
    } else {
      // Remove discard cards from hand
      setHand((currentHand) => 
        currentHand.filter((card) => !selectedDiscardCards.includes(card.id))
      );
      handleClearAwakenSelection();
    }
  };

  const handleClearAwakenSelection = () => {
    setSelectedHypnotizedCard(null);
    setSelectedDiscardCards([]);
  };

  const handleDrawCardInAction = async () => {
    const result = await drawCardInActionPhase(gameId);
    if (isActionError(result)) {
      console.error("Failed to draw card:", result.message);
    }
  };

  const handleEndActionPhase = async () => {
    const result = await endActionPhase(gameId);
    if (isActionError(result)) {
      console.error("Failed to end action phase:", result.message);
    }
  };

  const handleScoreThreeInARow = async () => {
    if (!selectedThreeInARow) return;
    const result = await scoreThreeInARow(gameId, selectedThreeInARow);
    if (isActionError(result)) {
      console.error("Failed to score:", result.message);
    } else {
      setSelectedThreeInARow(null);
    }
  };

  const handleEndTurn = async () => {
    const result = await endTurn(gameId);
    if (isActionError(result)) {
      console.error("Failed to end turn:", result.message);
    }
  };

  const getPhaseDisplayName = (phase: string | null) => {
    switch (phase) {
      case "DRAW": return "Draw Phase";
      case "AWAKEN": return "Awaken Phase";
      case "ACTION": return "Action Phase";
      case "SCORING": return "Scoring Phase";
      default: return "Waiting";
    }
  };

  const getCurrentTurnPlayerName = () => {
    if (!gameState.currentTurnPlayerId) return "Unknown";
    const turnPlayer = gameState.players.find(
      (p) => p.id === gameState.currentTurnPlayerId
    );
    return turnPlayer?.user.username || "Unknown";
  };

  return (
    <div className="flex flex-row h-full w-full">
      {/* Left Side - Game Field (50%) */}
      <div className="w-1/2 h-full min-h-0 overflow-hidden">
        <GameField
          grid={grid}
          selectedCard={selectedCard}
          onCardPlace={handleCardPlace}
          availableThreeInARows={availableThreeInARows}
          selectedThreeInARow={selectedThreeInARow}
          onThreeInARowSelect={setSelectedThreeInARow}
          isScoringPhase={currentPhase === "SCORING" && isMyTurn}
          isAwakenPhase={isAwakenPhase}
          selectedHypnotizedCard={selectedHypnotizedCard}
          onHypnotizedCardSelect={handleHypnotizedCardSelect}
        />
      </div>

      {/* Right Side - Hands (50%) */}
      <div className="w-1/2 h-full flex flex-col">
        {/* Opponent Hand - Top */}
        <div className="px-4 pt-4">
          <OpponentHand
            handCount={opponentHandCount}
            opponentName={opponent?.user.username}
          />
        </div>

        {/* Info Section */}
        <div className="flex-1 flex flex-col gap-4 p-4">
          {/* Game Status */}
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">Game Status</h3>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Phase: </span>
                <span>{getPhaseDisplayName(currentPhase)}</span>
              </div>
              <div>
                <span className="font-semibold">Turn: </span>
                <span>{getCurrentTurnPlayerName()}</span>
                {isMyTurn && <span className="ml-2 text-green-600">(Your Turn)</span>}
              </div>
              {gameState.status === "COMPLETED" && (
                <div className="text-lg font-bold text-green-600">
                  Game Over! Winner: {(gameState.playerScores || []).find(s => s.points >= 3) 
                    ? gameState.players.find(p => p.id === (gameState.playerScores || []).find(s => s.points >= 3)?.playerId)?.user.username
                    : "Unknown"}
                </div>
              )}
              <div className="mt-2">
                <span className="font-semibold">Scores: </span>
                {(gameState.playerScores || []).map((score) => {
                  const player = gameState.players.find(p => p.id === score.playerId);
                  return (
                    <div key={score.playerId}>
                      {player?.user.username}: {score.points} points
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Phase-Specific Actions */}
          {isMyTurn && gameState.status === "IN_PROGRESS" && (
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Actions</h3>
              <div className="space-y-2">
                {currentPhase === "DRAW" && (
                  <Button onClick={handleDrawCard} className="w-full">
                    Draw Card
                  </Button>
                )}

                {currentPhase === "AWAKEN" && (
                  <div className="space-y-2">
                    {selectedHypnotizedCard && (
                      <div className="text-sm p-2 bg-blue-50 rounded">
                        <div className="font-semibold">Selected Card:</div>
                        <div>Row {selectedHypnotizedCard.row}, Col {selectedHypnotizedCard.col}</div>
                      </div>
                    )}
                    {selectedDiscardCards.length > 0 && (
                      <div className="text-sm p-2 bg-yellow-50 rounded">
                        <div className="font-semibold">Discard Cards: {selectedDiscardCards.length}/2</div>
                        <div className="text-xs text-gray-600">
                          {selectedDiscardCards.map((id) => {
                            const card = hand.find((c) => c.id === id);
                            return card ? card.name : `Card ${id}`;
                          }).join(", ")}
                        </div>
                      </div>
                    )}
                    {selectedHypnotizedCard && selectedDiscardCards.length === 2 && (
                      <Button onClick={handleAwaken} className="w-full">
                        Awaken Card
                      </Button>
                    )}
                    {(selectedHypnotizedCard || selectedDiscardCards.length > 0) && (
                      <Button onClick={handleClearAwakenSelection} className="w-full" variant="outline">
                        Clear Selection
                      </Button>
                    )}
                    <Button onClick={handleSkipAwaken} className="w-full" variant="outline">
                      Skip Awaken
                    </Button>
                    {!selectedHypnotizedCard && (
                      <div className="text-sm text-gray-600 text-center">
                        Click a hypnotized card on the field to select it
                      </div>
                    )}
                    {selectedHypnotizedCard && selectedDiscardCards.length < 2 && (
                      <div className="text-sm text-gray-600 text-center">
                        Select 2 cards from your hand to discard
                      </div>
                    )}
                  </div>
                )}

                {currentPhase === "ACTION" && (
                  <div className="space-y-2">
                    <Button onClick={handleDrawCardInAction} className="w-full" variant="outline">
                      Draw Card
                    </Button>
                    <Button onClick={handleEndActionPhase} className="w-full" variant="outline">
                      End Action Phase
                    </Button>
                  </div>
                )}

                {currentPhase === "SCORING" && (
                  <div className="space-y-2">
                    {availableThreeInARows.length > 0 ? (
                      <>
                        <div className="text-sm mb-2">
                          Found {availableThreeInARows.length} three-in-a-row{availableThreeInARows.length > 1 ? "s" : ""}
                        </div>
                        {availableThreeInARows.map((threeInARow, index) => (
                          <Button
                            key={index}
                            onClick={() => setSelectedThreeInARow(threeInARow)}
                            className="w-full"
                            variant={selectedThreeInARow === threeInARow ? "default" : "outline"}
                          >
                            Select Set {index + 1}
                          </Button>
                        ))}
                        {selectedThreeInARow && (
                          <Button onClick={handleScoreThreeInARow} className="w-full">
                            Score Selected Set
                          </Button>
                        )}
                        <Button onClick={handleEndTurn} className="w-full" variant="outline">
                          End Turn
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleEndTurn} className="w-full">
                        End Turn (No three-in-a-rows)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isMyTurn && gameState.status === "IN_PROGRESS" && (
            <div className="border rounded-lg p-4">
              <div className="text-center text-gray-500">
                Waiting for {getCurrentTurnPlayerName()} to take their turn...
              </div>
            </div>
          )}
        </div>

        {/* Player Hand - Bottom (takes remaining space) */}
        <div className="px-4 pb-4 min-h-0 overflow-hidden">
          <PlayerHand
            hand={hand}
            selectedCard={selectedCard}
            onCardSelect={selectCard}
            isAwakenMode={isAwakenPhase}
            selectedDiscardCards={selectedDiscardCards}
            onDiscardCardSelect={handleDiscardCardSelect}
          />
        </div>
      </div>

      {/* Confirmation Dialog for Magic/Instant Cards */}
      <AlertDialog open={cardToConfirm !== null} onOpenChange={(open) => !open && handleCancelPlayCard()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Play {cardToConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This {cardToConfirm?.type} card will be played and moved to your discard pile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPlayCard}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPlayCard}>Play</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

