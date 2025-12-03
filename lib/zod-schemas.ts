import { z } from "zod";
import { DECK_TYPES } from "@/lib/card-types";

export const authSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(50, { message: "Username must be less than 50 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(100, { message: "Password must be less than 100 characters" }),
});

export const signupSchema = authSchema;

export const joinGameSchema = z.object({
  gameCode: z.string().min(1, { message: "Game code is required" }),
});

export type SignupSchema = z.infer<typeof signupSchema>;
export type JoinGameSchema = z.infer<typeof joinGameSchema>;

// Card ID array schema (for hand, deck, discardPile)
export const cardIdArraySchema = z.array(z.number().int().positive());

export const deckTypeSchema = z.enum(DECK_TYPES);

export const cardTypeSchema = z.enum(["creature", "magic", "instant"]);

export const abilityTypeSchema = z.enum([
  "draw1",
  "draw2",
  "draw3",
  "destroy",
  "summon",
  "repel",
  "displace",
  "swap",
  "hypnotize",
  "negate",
]);

export const cardEffectSchema = z.array(abilityTypeSchema);

const baseCardSchema = z.object({
  name: z.string(),
  image: z.string(),
  effect: cardEffectSchema,
  deck: deckTypeSchema,
  type: cardTypeSchema,
});

const creatureCardSchema = baseCardSchema.extend({
  type: z.literal("creature"),
  isBasic: z.boolean().nullable(),
});

const magicCardSchema = baseCardSchema.extend({
  type: z.literal("magic"),
});

const instantCardSchema = baseCardSchema.extend({
  type: z.literal("instant"),
});

export const cardSchema = z.discriminatedUnion("type", [
  creatureCardSchema,
  magicCardSchema,
  instantCardSchema,
]);

// CardGrid schema (flexible - can be refined later)
// For now, allowing any JSON structure since grid format may vary
export const cardGridSchema = z.any().nullable().optional();

// Helper functions that throw on invalid data
export function parseCardIdArray(data: unknown): number[] {
  return cardIdArraySchema.parse(data);
}

export function safeParseCardIdArray(data: unknown): number[] {
  return cardIdArraySchema.safeParse(data).success ? parseCardIdArray(data) : [];
}

export function parseDeckType(data: unknown): "demon" | "duck" {
  return deckTypeSchema.parse(data);
}

export function parseCardType(data: unknown): "creature" | "magic" | "instant" {
  return cardTypeSchema.parse(data);
}

export function parseCardEffect(data: unknown): z.infer<typeof cardEffectSchema> {
  return cardEffectSchema.parse(data);
}

export function parseCard(data: unknown) {
  return cardSchema.parse(data);
}

