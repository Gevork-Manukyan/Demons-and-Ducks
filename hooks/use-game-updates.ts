import { useState, useEffect, useRef, useCallback } from "react";
import type { GameState } from "@/actions/game-actions";

type GameUpdateMessage = {
  type: "connected" | "update" | "heartbeat" | "error";
  data?: GameState;
  message?: string;
};

type UseGameUpdatesReturn = {
  gameState: GameState | null;
  isConnected: boolean;
  error: string | null;
};

export function useGameUpdates(gameId: number): UseGameUpdatesReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(`/api/game/${gameId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: GameUpdateMessage = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              setIsConnected(true);
              break;
            case "update":
              if (message.data) {
                setGameState(message.data);
                setError(null);
              }
              break;
            case "heartbeat":
              // Keep connection alive, no state update needed
              break;
            case "error":
              setError(message.message || "An error occurred");
              break;
          }
        } catch (err) {
          console.error("[useGameUpdates] Failed to parse message:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };
    } catch (err) {
      console.error("[useGameUpdates] Failed to create EventSource:", err);
      setError("Failed to establish connection");
      setIsConnected(false);
    }
  }, [gameId]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    gameState,
    isConnected,
    error,
  };
}

