import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CardData = {
  name: string;
  image: string;
  effect: string[];
  deck: 'demon' | 'duck';
  type: 'creature' | 'magic' | 'instant';
  isBasic: boolean | null; // null for non-creature cards, true/false for creatures
};

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // DEMON DECK CARDS
  // ============================================
  
  const demonCards: CardData[] = [
    // ============================================
    // INSTANT CARDS (4 cards - all have same effect: ["negate"])
    // ============================================
    {
      name: 'Demonic Seal', 
      image: '/cards/demon-instant-1.svg', // TODO: Replace with actual image path
      effect: ['negate'], 
      deck: 'demon',
      type: 'instant',
      isBasic: null,
    },
    {
      name: 'Demonic Seal',
      image: '/cards/demon-instant-2.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'demon',
      type: 'instant',
      isBasic: null,
    },
    {
      name: 'Demonic Seal',
      image: '/cards/demon-instant-3.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'demon',
      type: 'instant',
      isBasic: null,
    },
    {
      name: 'Demonic Seal',
      image: '/cards/demon-instant-4.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'demon',
      type: 'instant',
      isBasic: null,
    },

    // ============================================
    // BASIC CREATURE CARDS (15 cards - no effects, isBasic: true)
    // ============================================
    {
      name: 'junior fiend',
      image: '/cards/basic-demon-1.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'junior fiend',
      image: '/cards/basic-demon-2.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'junior fiend',
      image: '/cards/basic-demon-3.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'hell houndling',
      image: '/cards/basic-demon-4.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'hell houndling',
      image: '/cards/basic-demon-5.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'hell houndling',
      image: '/cards/basic-demon-6.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'skellilad',
      image: '/cards/basic-demon-7.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'skellilad',
      image: '/cards/basic-demon-8.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'skellilad',
      image: '/cards/basic-demon-9.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'batty boi',
      image: '/cards/basic-demon-10.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'batty boi',
      image: '/cards/basic-demon-11.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'batty boi',
      image: '/cards/basic-demon-12.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'coal foal',
      image: '/cards/basic-demon-13.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'coal foal',
      image: '/cards/basic-demon-14.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'coal foal',
      image: '/cards/basic-demon-15.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'demon',
      type: 'creature',
      isBasic: true,
    },

    // ============================================
    // SPECIAL EFFECT CREATURE CARDS (13 cards - have effects, isBasic: false)
    // Available effects: "draw1", "draw2", "draw3", "destroy", "summon", "repel", "displace", "swap", "hypnotize"
    // ============================================
    {
      name: 'beast of below',
      image: '/cards/fire-demon.svg', // TODO: Replace with actual image path
      effect: ['swap'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'beast of below',
      image: '/cards/special-demon-2.svg', // TODO: Replace with actual image path
      effect: ['swap'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'undead master',
      image: '/cards/special-demon-3.svg', // TODO: Replace with actual image path
      effect: ['hypnotize'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'undead master',
      image: '/cards/special-demon-4.svg', // TODO: Replace with actual image path
      effect: ['hypnotize'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'night mare',
      image: '/cards/special-demon-5.svg', // TODO: Replace with actual image path
      effect: ['destroy'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'night mare',
      image: '/cards/special-demon-6.svg', // TODO: Replace with actual image path
      effect: ['destroy'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'night mare',
      image: '/cards/special-demon-7.svg', // TODO: Replace with actual image path
      effect: ['destroy'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'scribe of pain',
      image: '/cards/special-demon-8.svg', // TODO: Replace with actual image path
      effect: ['draw1'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'scribe of pain',
      image: '/cards/special-demon-9.svg', // TODO: Replace with actual image path
      effect: ['draw1'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'scribe of pain',
      image: '/cards/special-demon-10.svg', // TODO: Replace with actual image path
      effect: ['draw1'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'unbound fury',
      image: '/cards/special-demon-11.svg', // TODO: Replace with actual image path
      effect: ['summon'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'unbound fury',
      image: '/cards/special-demon-12.svg', // TODO: Replace with actual image path
      effect: ['summon'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'unbound fury',
      image: '/cards/special-demon-13.svg', // TODO: Replace with actual image path
      effect: ['summon'],
      deck: 'demon',
      type: 'creature',
      isBasic: false,
    },

    // ============================================
    // MAGIC CARDS (8 cards)
    // Available effects: "draw1", "draw2", "draw3", "destroy", "summon", "repel", "displace", "swap", "hypnotize"
    // ============================================
    {
      name: 'mesmerizing medallion',
      image: '/cards/dark-ritual.svg', // TODO: Replace with actual image path
      effect: ['hypnotize', 'draw1'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'mesmerizing medallion',
      image: '/cards/magic-demon-2.svg', // TODO: Replace with actual image path
      effect: ['hypnotize', 'draw1'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'infernal exchange',
      image: '/cards/magic-demon-3.svg', // TODO: Replace with actual image path
      effect: ['swap', 'draw1'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'infernal exchange',
      image: '/cards/magic-demon-4.svg', // TODO: Replace with actual image path
      effect: ['swap', 'draw1'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'book of the undead',
      image: '/cards/magic-demon-5.svg', // TODO: Replace with actual image path
      effect: ['draw2'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'book of the undead',
      image: '/cards/magic-demon-6.svg', // TODO: Replace with actual image path
      effect: ['draw2'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'incendiary memo',
      image: '/cards/magic-demon-7.svg', // TODO: Replace with actual image path
      effect: ['destroy', 'draw1'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'spirits of darkness',
      image: '/cards/magic-demon-8.svg', // TODO: Replace with actual image path
      effect: ['draw3'],
      deck: 'demon',
      type: 'magic',
      isBasic: null,
    },
  ];

  // ============================================
  // DUCK DECK CARDS
  // ============================================
  
  const duckCards: CardData[] = [
    // ============================================
    // INSTANT CARDS (4 cards - all have same effect: ["negate"])
    // ============================================
    {
      name: 'Duck Egg',
      image: '/cards/duck-instant-1.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'duck',
      type: 'instant',
      isBasic: null,
    },
    {
      name: 'Duck Egg',
      image: '/cards/duck-instant-2.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'duck',
      type: 'instant',
      isBasic: null,
    },
    {
      name: 'Duck Egg',
      image: '/cards/duck-instant-3.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'duck',
      type: 'instant',
      isBasic: null,
    },
    {
      name: 'Duck Egg',
      image: '/cards/duck-instant-4.svg', // TODO: Replace with actual image path
      effect: ['negate'],
      deck: 'duck',
      type: 'instant',
      isBasic: null,
    },

    // ============================================
    // BASIC CREATURE CARDS (15 cards - no effects, isBasic: true)
    // ============================================
    {
      name: 'peep',
      image: '/cards/basic-duck-1.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'peep',
      image: '/cards/basic-duck-2.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'peep',
      image: '/cards/basic-duck-3.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'honk',
      image: '/cards/basic-duck-4.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'honk',
      image: '/cards/basic-duck-5.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'honk',
      image: '/cards/basic-duck-6.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'crumb',
      image: '/cards/basic-duck-7.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'crumb',
      image: '/cards/basic-duck-8.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'crumb',
      image: '/cards/basic-duck-9.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'squeak',
      image: '/cards/basic-duck-10.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'squeak',
      image: '/cards/basic-duck-11.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'squeak',
      image: '/cards/basic-duck-12.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'the chicks',
      image: '/cards/basic-duck-13.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'the chicks',
      image: '/cards/basic-duck-14.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },
    {
      name: 'the chicks',
      image: '/cards/basic-duck-15.svg', // TODO: Replace with actual image path
      effect: [],
      deck: 'duck',
      type: 'creature',
      isBasic: true,
    },

    // ============================================
    // SPECIAL EFFECT CREATURE CARDS (13 cards - have effects, isBasic: false)
    // Available effects: "draw1", "draw2", "draw3", "destroy", "summon", "repel", "displace", "swap", "hypnotize"
    // ============================================
    {
      name: 'bomber betsy',
      image: '/cards/special-duck-1.svg', // TODO: Replace with actual image path
      effect: ['repel'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'bomber betsy',
      image: '/cards/special-duck-2.svg', // TODO: Replace with actual image path
      effect: ['repel'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'pirate pete',
      image: '/cards/special-duck-3.svg', // TODO: Replace with actual image path
      effect: ['displace'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'pirate pete',
      image: '/cards/special-duck-4.svg', // TODO: Replace with actual image path
      effect: ['displace'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'anxious allen',
      image: '/cards/special-duck-5.svg', // TODO: Replace with actual image path
      effect: ['draw1'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'anxious allen',
      image: '/cards/special-duck-6.svg', // TODO: Replace with actual image path
      effect: ['draw1'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'anxious allen',
      image: '/cards/special-duck-7.svg', // TODO: Replace with actual image path
      effect: ['draw1'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'grenadier gary',
      image: '/cards/special-duck-8.svg', // TODO: Replace with actual image path
      effect: ['destroy'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'grenadier gary',
      image: '/cards/special-duck-9.svg', // TODO: Replace with actual image path
      effect: ['destroy'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'grenadier gary',
      image: '/cards/special-duck-10.svg', // TODO: Replace with actual image path
      effect: ['destroy'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'pyro penny',
      image: '/cards/special-duck-11.svg', // TODO: Replace with actual image path
      effect: ['summon'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'pyro penny',
      image: '/cards/special-duck-12.svg', // TODO: Replace with actual image path
      effect: ['summon'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },
    {
      name: 'pyro penny',
      image: '/cards/special-duck-13.svg', // TODO: Replace with actual image path
      effect: ['summon'],
      deck: 'duck',
      type: 'creature',
      isBasic: false,
    },

    // ============================================
    // MAGIC CARDS (8 cards)
    // Available effects: "draw1", "draw2", "draw3", "destroy", "summon", "repel", "displace", "swap", "hypnotize"
    // ============================================
    {
      name: 'the quackening',
      image: '/cards/magic-duck-1.svg', // TODO: Replace with actual image path
      effect: ['displace', 'draw1'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'the quackening',
      image: '/cards/magic-duck-2.svg', // TODO: Replace with actual image path
      effect: ['displace', 'draw1'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'slice and dice',
      image: '/cards/magic-duck-3.svg', // TODO: Replace with actual image path
      effect: ['repel', 'draw1'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'slice and dice',
      image: '/cards/magic-duck-4.svg', // TODO: Replace with actual image path
      effect: ['repel', 'draw1'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'duck duck',
      image: '/cards/magic-duck-5.svg', // TODO: Replace with actual image path
      effect: ['draw2'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'duck duck',
      image: '/cards/magic-duck-6.svg', // TODO: Replace with actual image path
      effect: ['draw2'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'choosing violence',
      image: '/cards/magic-duck-7.svg', // TODO: Replace with actual image path
      effect: ['destroy', 'draw1'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
    {
      name: 'nest egg',
      image: '/cards/magic-duck-8.svg', // TODO: Replace with actual image path
      effect: ['draw3'],
      deck: 'duck',
      type: 'magic',
      isBasic: null,
    },
  ];

  // Insert all cards into database
  console.log(`📦 Inserting ${demonCards.length + duckCards.length} cards...`);
  
  for (const card of [...demonCards, ...duckCards]) {
    await prisma.card.upsert({
      where: {
        name_deck: {
          name: card.name,
          deck: card.deck,
        },
      },
      update: {
        image: card.image,
        effect: card.effect,
        type: card.type,
        isBasic: card.isBasic,
      },
      create: {
        name: card.name,
        image: card.image,
        effect: card.effect,
        deck: card.deck,
        type: card.type,
        isBasic: card.isBasic,
      },
    });
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

