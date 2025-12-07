import type { Card } from "@/lib/card-types";
import type { Card as PrismaCard } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  parseCardEffect,
  parseDeckType,
  parseCardType,
  parseCardIdArray,
} from "@/lib/zod-schemas";

/**
 * Converts a Prisma Card model to a CardType
 */
export function convertPrismaCardToCardType(card: PrismaCard): Card {
  const effect = parseCardEffect(card.effect);
  const deck = parseDeckType(card.deck);
  const type = parseCardType(card.type);

  // Handle different card types
  if (type === "creature") {
    return {
      name: card.name,
      image: card.image,
      effect: effect,
      deck: deck,
      type: "creature" as const,
      isBasic: card.isBasic ?? false, // Default to false if null
    };
  } else if (type === "magic") {
    return {
      name: card.name,
      image: card.image,
      effect: effect,
      deck: deck,
      type: "magic" as const,
    };
  } else {
    // instant
    return {
      name: card.name,
      image: card.image,
      effect: effect,
      deck: deck,
      type: "instant" as const,
    };
  }
}

/**
 * Helper function to calculate opponent hand count from players array
 */
export function calculateOpponentHandCount(
  players: Array<{ userId: number; hand: Prisma.JsonValue }>,
  currentUserId: number
): number {
  const opponent = players.find((p) => p.userId !== currentUserId);
  return opponent ? parseCardIdArray(opponent.hand).length : 0;
}

