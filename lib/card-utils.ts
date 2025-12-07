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

  const returnObj = {
    id: card.id,
    name: card.name,
    image: card.image,
    effect,
    deck
  }

  // Handle different card types
  if (type === "creature") {
    return {...returnObj, type: "creature" as const, isBasic: card.isBasic ?? false};
  } else if (type === "magic") {
    return {...returnObj, type: "magic" as const};
  } else {
    return {...returnObj, type: "instant" as const};
  }
}

/**
 * Helper function to convert card records to Card array preserving handCardIds order
 */
export function convertCardRecordsToHand(
  cardRecords: PrismaCard[],
  handCardIds: number[]
): Card[] {
  // Create a Map from card ID to card record for efficient lookup
  const cardIdToRecordMap = new Map(cardRecords.map(record => [record.id, record]));

  // Build the hand array in the same order as handCardIds
  return handCardIds
    .map(cardId => {
      const record = cardIdToRecordMap.get(cardId);
      return record ? convertPrismaCardToCardType(record) : null;
    })
    .filter((card): card is Card => card !== null);
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

