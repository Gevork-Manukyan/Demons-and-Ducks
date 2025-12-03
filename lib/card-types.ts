export const DECK_TYPES = ["demon", "duck"] as const;

export type DeckType = (typeof DECK_TYPES)[number];

export type AbilityType =
  | "draw1"
  | "draw2"
  | "draw3"
  | "destroy"
  | "summon"
  | "repel"
  | "displace"
  | "swap"
  | "hypnotize"
  | "negate";

export type CardEffect = AbilityType[];

export type CardType = "creature" | "magic" | "instant";

type BaseCard = {
  name: string;
  image: string;
  effect: CardEffect;
  deck: DeckType;
  type: CardType;
};

export type CreatureCard = BaseCard & {
  type: "creature";
  isBasic: boolean;
};

export type MagicCard = BaseCard & {
  type: "magic";
};

export type InstantCard = BaseCard & {
  type: "instant";
};

export type Card = CreatureCard | MagicCard | InstantCard;

