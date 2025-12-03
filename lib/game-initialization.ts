import { prisma } from "@/lib/prisma";
import { safeParseCardIdArray } from "@/lib/zod-schemas";
import { DECK_TYPES } from "@/lib/card-types";

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initializes a game by assigning decks, shuffling, drawing cards, and selecting first player
 */
export async function initializeGame(gameId: number): Promise<void> {
  // Fetch game and players
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: true,
    },
  });

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (game.players.length !== 2) {
    throw new Error(`Game must have exactly 2 players, found ${game.players.length}`);
  }

  // Check if game is already initialized (decks are populated)
  const firstPlayer = game.players[0];
  const deckArray = safeParseCardIdArray(firstPlayer.deck);
  if (deckArray.length > 0) return;

  // Randomly assign demon/duck decks ensuring they're different
  const shuffledDeckTypes = shuffleArray([...DECK_TYPES]);
  
  const player1 = game.players[0];
  const player2 = game.players[1];
  const player1DeckType = shuffledDeckTypes[0];
  const player2DeckType = shuffledDeckTypes[1];

  // Fetch all cards for each deck type
  const [demonCards, duckCards] = await Promise.all([
    prisma.card.findMany({ where: { deck: DECK_TYPES[0] } }),
    prisma.card.findMany({ where: { deck: DECK_TYPES[1] } }),
  ]);

  // Shuffle each deck
  const player1Deck = player1DeckType === DECK_TYPES[0] ? demonCards : duckCards;
  const player2Deck = player2DeckType === DECK_TYPES[0] ? demonCards : duckCards;
  
  const shuffledPlayer1Deck = shuffleArray(player1Deck);
  const shuffledPlayer2Deck = shuffleArray(player2Deck);

  // Draw 6 cards for each player (first 6 cards go to hand, rest stay in deck)
  const player1Hand = shuffledPlayer1Deck.slice(0, 6).map(card => card.id);
  const player1DeckRemaining = shuffledPlayer1Deck.slice(6).map(card => card.id);
  
  const player2Hand = shuffledPlayer2Deck.slice(0, 6).map(card => card.id);
  const player2DeckRemaining = shuffledPlayer2Deck.slice(6).map(card => card.id);

  // Randomly select first player
  const firstPlayerId = Math.random() < 0.5 ? player1.id : player2.id;

  // Update all players and game in a transaction
  await prisma.$transaction([
    prisma.player.update({
      where: { id: player1.id },
      data: {
        hand: player1Hand,
        deck: player1DeckRemaining,
        discardPile: [],
      },
    }),
    prisma.player.update({
      where: { id: player2.id },
      data: {
        hand: player2Hand,
        deck: player2DeckRemaining,
        discardPile: [],
      },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: {
        currentTurnPlayerId: firstPlayerId,
      },
    }),
  ]);
}

