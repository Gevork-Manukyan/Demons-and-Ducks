"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  type PendingEffect,
} from "@/actions/game-actions";
import {
  resolveDestroyEffect,
  resolveRepelEffect,
  resolveDisplaceEffect,
  resolveSwapEffect,
  resolveHypnotizeEffect,
} from "@/actions/card-effect-actions";
import { isActionSuccess, isActionError, type ActionResult } from "@/lib/errors";
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
  const [selectedScoringCards, setSelectedScoringCards] = useState<Array<{row: number, col: number}>>([]);
  const [selectedHypnotizedCard, setSelectedHypnotizedCard] = useState<{row: number, col: number} | null>(null);
  const [selectedDiscardCards, setSelectedDiscardCards] = useState<number[]>([]);
  const [pendingEffects, setPendingEffects] = useState<PendingEffect[]>([]);
  const [selectedEffectTarget, setSelectedEffectTarget] = useState<{row: number, col: number} | null>(null);
  const [selectedEffectTargets, setSelectedEffectTargets] = useState<Array<{row: number, col: number}>>([]);
  const [displaceSource, setDisplaceSource] = useState<{row: number, col: number} | null>(null);

  const isMyTurn = currentPlayer && gameState.currentTurnPlayerId === currentPlayer.id;
  const currentPhase = gameState.currentPhase;
  const isAwakenPhase = currentPhase === "AWAKEN" && isMyTurn;
  const isActionPhase = currentPhase === "ACTION" && isMyTurn;
  const canPlaceCreature = isActionPhase && (
    (!gameState.creatureCardPlayedThisTurn && gameState.magicCardsPlayedThisTurn === 0) ||
    gameState.summonUsedThisTurn
  );
  const canPlayMagic = isActionPhase && !gameState.creatureCardPlayedThisTurn && gameState.magicCardsPlayedThisTurn < 2;

  // Track last gameState object reference to detect stream updates
  const lastGameStateRef = useRef<GameState | null>(null);
  const handLengthRef = useRef(hand.length);

  // Update hand length ref when hand changes
  useEffect(() => {
    handLengthRef.current = hand.length;
  }, [hand.length]);

  // Fetch hand when game status becomes IN_PROGRESS or when gameState updates from stream
  useEffect(() => {
    if (gameState.status === "IN_PROGRESS") {
      // Refetch hand whenever gameState object changes (stream update) or if hand is empty
      // The stream sends updates when hand changes, so we refetch on any gameState update
      const gameStateChanged = lastGameStateRef.current !== gameState;
      
      if (gameStateChanged || handLengthRef.current === 0) {
        const fetchHand = async () => {
          const handResult = await getPlayerHand(gameId);
          if (isActionSuccess(handResult)) {
            setHand(handResult.data);
            lastGameStateRef.current = gameState;
          } else {
            console.error("Failed to fetch hand:", handResult.error);
          }
        };

        fetchHand();
      }
    }
  }, [gameState, gameId]);

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

  // Track previous phase for cleanup
  const prevPhaseRef = useRef(currentPhase);
  
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
    
    // Reset state when leaving SCORING phase
    const wasScoring = prevPhaseRef.current === "SCORING";
    const isScoring = currentPhase === "SCORING";
    if (wasScoring && !isScoring) {
      const timeoutId = setTimeout(() => {
        setAvailableThreeInARows([]);
        setSelectedScoringCards([]);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    
    prevPhaseRef.current = currentPhase;
  }, [currentPhase, isMyTurn, gameId]);

  // Reset awaken selections when phase changes away from AWAKEN
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

    // Check for pending effects that need selection
    if (isActionSuccess(result) && result.data.length > 0) {
      setPendingEffects(result.data);
    }
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
    
    // Check for pending effects that need selection
    if (isActionSuccess(result) && result.data.length > 0) {
      setPendingEffects(result.data);
      clearSelection();
    } else {
      clearSelection();
    }
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

  const handleCardSelect = (card: CardType | null) => {
    if (card && card.type === "creature" && !canPlaceCreature) {
      return;
    }
    selectCard(card);
  };

  const handleScoringCardSelect = (row: number, col: number) => {
    if (!isMyTurn || currentPhase !== "SCORING") return;
    
    setSelectedScoringCards((current) => {
      // Check if already selected
      const index = current.findIndex((pos) => pos.row === row && pos.col === col);
      if (index >= 0) {
        // Deselect
        return current.filter((_, i) => i !== index);
      } else if (current.length < 3) {
        // Add if less than 3
        return [...current, { row, col }];
      }
      // Already have 3, don't add more
      return current;
    });
  };

  // Check if selected cards form a valid three-in-a-row
  const isValidSelection = useMemo(() => {
    if (selectedScoringCards.length !== 3) return false;
    
    // Check if the selected cards are part of any valid three-in-a-row set
    return availableThreeInARows.some((threeInARow) => {
      const threeInARowSet = new Set(threeInARow.map((p) => `${p.row},${p.col}`));
      const selectedSet = new Set(selectedScoringCards.map((p) => `${p.row},${p.col}`));
      
      // Check if all selected positions are in this three-in-a-row
      return selectedScoringCards.every((pos) => 
        threeInARowSet.has(`${pos.row},${pos.col}`)
      ) && threeInARowSet.size === selectedSet.size;
    });
  }, [selectedScoringCards, availableThreeInARows]);

  const handleScoreThreeInARow = async () => {
    if (selectedScoringCards.length !== 3) return;
    if (!isValidSelection) {
      console.error("Selected cards do not form a valid three-in-a-row");
      return;
    }
    
    const result = await scoreThreeInARow(gameId, selectedScoringCards);
    if (isActionError(result)) {
      console.error("Failed to score:", result.message);
    } else {
      setSelectedScoringCards([]);
      // Refetch available three-in-a-rows after scoring
      if (currentPhase === "SCORING" && isMyTurn) {
        const fetchResult = await getAvailableThreeInARows(gameId);
        if (isActionSuccess(fetchResult)) {
          setAvailableThreeInARows(fetchResult.data);
        }
      }
    }
  };

  const handleClearScoringSelection = () => {
    setSelectedScoringCards([]);
  };

  const handleEndTurn = async () => {
    const result = await endTurn(gameId);
    if (isActionError(result)) {
      console.error("Failed to end turn:", result.message);
    }
  };

  // Effect selection handlers
  const handleEffectCardSelect = (row: number, col: number) => {
    if (pendingEffects.length === 0) return;

    const currentEffect = pendingEffects[0];
    
    if (currentEffect.type === "destroy" || currentEffect.type === "repel" || currentEffect.type === "hypnotize") {
      // Single target selection
      if (selectedEffectTarget?.row === row && selectedEffectTarget?.col === col) {
        setSelectedEffectTarget(null);
      } else {
        setSelectedEffectTarget({ row, col });
      }
    } else if (currentEffect.type === "swap") {
      // Two target selection
      const isSelected = selectedEffectTargets.some(
        (pos) => pos.row === row && pos.col === col
      );
      if (isSelected) {
        setSelectedEffectTargets((current) =>
          current.filter((pos) => !(pos.row === row && pos.col === col))
        );
      } else if (selectedEffectTargets.length < 2) {
        setSelectedEffectTargets((current) => [...current, { row, col }]);
      }
    } else if (currentEffect.type === "displace") {
      // Two-step: first select source, then target
      if (!displaceSource) {
        setDisplaceSource({ row, col });
      } else {
        setSelectedEffectTarget({ row, col });
      }
    }
  };

  const handleResolveEffect = async () => {
    if (pendingEffects.length === 0) return;

    const currentEffect = pendingEffects[0];
    let result: ActionResult<void>;

    const drawCount = currentEffect.drawCount;
    
    if (currentEffect.type === "destroy") {
      if (!selectedEffectTarget) return;
      result = await resolveDestroyEffect(
        gameId,
        currentEffect.cardId,
        selectedEffectTarget.row,
        selectedEffectTarget.col,
        drawCount
      );
    } else if (currentEffect.type === "repel") {
      if (!selectedEffectTarget) return;
      result = await resolveRepelEffect(
        gameId,
        currentEffect.cardId,
        selectedEffectTarget.row,
        selectedEffectTarget.col,
        drawCount
      );
    } else if (currentEffect.type === "hypnotize") {
      if (!selectedEffectTarget) return;
      result = await resolveHypnotizeEffect(
        gameId,
        currentEffect.cardId,
        selectedEffectTarget.row,
        selectedEffectTarget.col,
        drawCount
      );
    } else if (currentEffect.type === "swap") {
      if (selectedEffectTargets.length !== 2) return;
      result = await resolveSwapEffect(
        gameId,
        currentEffect.cardId,
        selectedEffectTargets[0].row,
        selectedEffectTargets[0].col,
        selectedEffectTargets[1].row,
        selectedEffectTargets[1].col,
        drawCount
      );
    } else if (currentEffect.type === "displace") {
      if (!displaceSource || !selectedEffectTarget) return;
      result = await resolveDisplaceEffect(
        gameId,
        currentEffect.cardId,
        displaceSource.row,
        displaceSource.col,
        selectedEffectTarget.row,
        selectedEffectTarget.col,
        drawCount
      );
    } else {
      return;
    }

    if (isActionError(result)) {
      console.error("Failed to resolve effect:", result.message);
      return;
    }

    // Move to next effect or clear
    const remainingEffects = pendingEffects.slice(1);
    if (remainingEffects.length > 0) {
      setPendingEffects(remainingEffects);
    } else {
      setPendingEffects([]);
      // After resolving all effects, check if phase should advance
      // Phase should advance if:
      // 1. This was the last effect
      // 2. We're still in ACTION phase
      // 3. Either: 2 magic cards were played OR a creature was played (normal flow)
      // 4. No summon is available (summon would allow placing a creature)
      if (
        currentPhase === "ACTION" &&
        isMyTurn &&
        !gameState.summonUsedThisTurn &&
        (gameState.magicCardsPlayedThisTurn >= 2 || gameState.creatureCardPlayedThisTurn)
      ) {
        await handleEndActionPhase();
      }
    }
    setSelectedEffectTarget(null);
    setSelectedEffectTargets([]);
    setDisplaceSource(null);
  };

  const handleCancelEffect = () => {
    setPendingEffects([]);
    setSelectedEffectTarget(null);
    setSelectedEffectTargets([]);
    setDisplaceSource(null);
  };

  const currentPendingEffect = pendingEffects.length > 0 ? pendingEffects[0] : null;

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
          selectedCard={canPlaceCreature ? selectedCard : null}
          onCardPlace={handleCardPlace}
          availableThreeInARows={availableThreeInARows}
          selectedScoringCards={selectedScoringCards}
          onScoringCardSelect={handleScoringCardSelect}
          isScoringPhase={currentPhase === "SCORING" && isMyTurn}
          isAwakenPhase={isAwakenPhase}
          selectedHypnotizedCard={selectedHypnotizedCard}
          onHypnotizedCardSelect={handleHypnotizedCardSelect}
          canPlaceCreature={canPlaceCreature}
          pendingEffectType={currentPendingEffect?.type || null}
          selectedEffectTarget={selectedEffectTarget}
          selectedEffectTargets={selectedEffectTargets}
          displaceSource={displaceSource}
          onEffectCardSelect={handleEffectCardSelect}
          currentPlayerId={currentPlayer?.id || null}
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
                    {currentPendingEffect ? (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold p-2 bg-purple-50 rounded">
                          Resolve Effect: {currentPendingEffect.type}
                        </div>
                        {currentPendingEffect.type === "destroy" && (
                          <>
                            {selectedEffectTarget && (
                              <div className="text-xs p-2 bg-red-50 rounded">
                                Target: Row {selectedEffectTarget.row}, Col {selectedEffectTarget.col}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              Select an opponent creature to destroy
                            </div>
                            {selectedEffectTarget && (
                              <Button onClick={handleResolveEffect} className="w-full">
                                Destroy Card
                              </Button>
                            )}
                          </>
                        )}
                        {currentPendingEffect.type === "repel" && (
                          <>
                            {selectedEffectTarget && (
                              <div className="text-xs p-2 bg-blue-50 rounded">
                                Target: Row {selectedEffectTarget.row}, Col {selectedEffectTarget.col}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              Select a creature to return to its owner&apos;s hand
                            </div>
                            {selectedEffectTarget && (
                              <Button onClick={handleResolveEffect} className="w-full">
                                Repel Card
                              </Button>
                            )}
                          </>
                        )}
                        {currentPendingEffect.type === "hypnotize" && (
                          <>
                            {selectedEffectTarget && (
                              <div className="text-xs p-2 bg-purple-50 rounded">
                                Target: Row {selectedEffectTarget.row}, Col {selectedEffectTarget.col}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              Select a creature to hypnotize
                            </div>
                            {selectedEffectTarget && (
                              <Button onClick={handleResolveEffect} className="w-full">
                                Hypnotize Card
                              </Button>
                            )}
                          </>
                        )}
                        {currentPendingEffect.type === "swap" && (
                          <>
                            {selectedEffectTargets.length > 0 && (
                              <div className="text-xs p-2 bg-green-50 rounded">
                                Selected: {selectedEffectTargets.map((pos, i) => 
                                  `(${pos.row},${pos.col})${i < selectedEffectTargets.length - 1 ? ', ' : ''}`
                                ).join('')} ({selectedEffectTargets.length}/2)
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              Select two creatures to swap positions
                            </div>
                            {selectedEffectTargets.length === 2 && (
                              <Button onClick={handleResolveEffect} className="w-full">
                                Swap Cards
                              </Button>
                            )}
                          </>
                        )}
                        {currentPendingEffect.type === "displace" && (
                          <>
                            {displaceSource && (
                              <div className="text-xs p-2 bg-yellow-50 rounded">
                                Source: Row {displaceSource.row}, Col {displaceSource.col}
                              </div>
                            )}
                            {selectedEffectTarget && (
                              <div className="text-xs p-2 bg-blue-50 rounded">
                                Target: Row {selectedEffectTarget.row}, Col {selectedEffectTarget.col}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              {!displaceSource 
                                ? "Select a creature to move"
                                : "Select an empty space to move to"
                              }
                            </div>
                            {displaceSource && selectedEffectTarget && (
                              <Button onClick={handleResolveEffect} className="w-full">
                                Displace Card
                              </Button>
                            )}
                          </>
                        )}
                        <Button onClick={handleCancelEffect} className="w-full" variant="outline">
                          Cancel Effect
                        </Button>
                      </div>
                    ) : (
                      <>
                        {gameState.magicCardsPlayedThisTurn === 0 && !gameState.creatureCardPlayedThisTurn && (
                          <Button onClick={handleDrawCardInAction} className="w-full" variant="outline">
                            Draw Card
                          </Button>
                        )}
                        {gameState.magicCardsPlayedThisTurn > 0 && (
                          <div className="text-sm text-gray-600 p-2 bg-yellow-50 rounded">
                            Magic card played. You can only play another magic card or end the phase.
                          </div>
                        )}
                        {gameState.creatureCardPlayedThisTurn && (
                          <div className="text-sm text-gray-600 p-2 bg-blue-50 rounded">
                            Creature card played. Phase will advance automatically.
                          </div>
                        )}
                        <Button onClick={handleEndActionPhase} className="w-full" variant="outline">
                          End Action Phase
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {currentPhase === "SCORING" && (
                  <div className="space-y-2">
                    {availableThreeInARows.length > 0 ? (
                      <>
                        <div className="text-sm mb-2">
                          Select 3 cards to score ({selectedScoringCards.length}/3)
                        </div>
                        {selectedScoringCards.length > 0 && (
                          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                            Selected: {selectedScoringCards.map((pos, i) => 
                              `(${pos.row},${pos.col})${i < selectedScoringCards.length - 1 ? ', ' : ''}`
                            ).join('')}
                          </div>
                        )}
                        {selectedScoringCards.length === 3 && (
                          <>
                            {!isValidSelection && (
                              <div className="text-xs text-red-600 p-2 bg-red-50 rounded">
                                Selected cards do not form a valid three-in-a-row
                              </div>
                            )}
                            <Button 
                              onClick={handleScoreThreeInARow} 
                              className="w-full"
                              disabled={!isValidSelection}
                            >
                              Score Selected Cards
                            </Button>
                          </>
                        )}
                        {selectedScoringCards.length > 0 && (
                          <Button onClick={handleClearScoringSelection} className="w-full" variant="outline">
                            Clear Selection
                          </Button>
                        )}
                        <Button onClick={handleEndTurn} className="w-full" variant="outline">
                          End Turn
                        </Button>
                        <div className="text-xs text-gray-500 text-center">
                          Click highlighted cards on the field to select them
                        </div>
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
            onCardSelect={handleCardSelect}
            isAwakenMode={isAwakenPhase}
            selectedDiscardCards={selectedDiscardCards}
            onDiscardCardSelect={handleDiscardCardSelect}
            canSelectCreature={canPlaceCreature}
            canPlayMagic={canPlayMagic}
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

