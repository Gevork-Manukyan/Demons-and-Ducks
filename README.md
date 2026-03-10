## Demons and Ducks

A turn-based multiplayer card game built with Next.js, NextAuth, Prisma, and PostgreSQL.

Demons and Ducks lets players sign up, create or join games via a short code, wait in a lobby until everyone is ready, and then battle on a shared grid-based board. Game state (cards, hands, deck, discard piles, scores, phases, and turn information) is persisted in PostgreSQL via Prisma and streamed to clients using a server‑sent events (SSE) endpoint.

## Features

- **Authentication & accounts** – Credentials-based auth with NextAuth and a Prisma `User` model. Players can sign up, sign in, and keep their games tied to their account.
- **Lobby & game lifecycle** – From the lobby, players can **create a new game** or **join an existing one** using a game code. The `/game/[gameId]` route redirects to the appropriate sub‑view based on the game’s status (`WAITING`, `IN_PROGRESS`, `COMPLETED`).
- **Waiting room** – The waiting screen shows all current players, their usernames, and whether they are ready. Players toggle their ready status; once everyone is ready, the game transitions into play.
- **Turn-based gameplay** – Each match tracks **phases** (`DRAW`, `AWAKEN`, `ACTION`, `SCORING`), the active player (`currentTurnPlayerId`), per‑player points, and per‑turn limits (creature/magic plays, summon usage).
- **Card & board state** – Cards live in a `Card` table, while `Game` and `Player` models track the grid, decks, hands, discard piles, and current points as JSON fields plus structured columns.
- **Live updates with SSE** – Clients connect to `/api/game/[gameId]/stream` to receive server‑sent events whenever the game state changes (or a heartbeat when it does not), powering real‑time UI updates without a separate WebSocket server.
- **Type‑safe backend** – Prisma models (`User`, `Game`, `Player`, `Card`, and NextAuth‑related models) and Zod‑backed helpers keep game actions and streaming payloads validated and type‑safe.

## Architecture

```mermaid
flowchart LR
  subgraph client [Client]
    NextJs[Next.js App Router]
  end

  subgraph server [Next.js Server]
    Pages[App routes (/lobby, /game/...)]
    AuthRoute["/api/auth/[...nextauth]"]
    GameActions["Server actions (game-actions)"]
    GameStream["SSE /api/game/[gameId]/stream"]
  end

  subgraph persistence [Persistence]
    Postgres[(PostgreSQL)]
  end

  NextJs -->|HTTP + Server Components| Pages
  NextJs -->|SSE| GameStream
  Pages --> GameActions
  GameActions --> Postgres
  GameStream --> GameActions
```

- **Client** – Next.js App Router UI (auth screens, lobby, waiting room, gameplay) built with React, Tailwind CSS, and shadcn‑ui components.
- **Server** – Next.js API routes and server actions for auth, game creation/joining, and game state queries.
- **Persistence** – PostgreSQL accessed via Prisma; game, player, and card state is saved and queried per request / poll.

## Project Structure

- **`app/`** – App Router pages:
  - **`app/page.tsx`** – Landing page with sign‑in form.
  - **`app/(auth)/signup/page.tsx`** – Sign‑up form that creates a user and automatically signs them in.
  - **`app/(auth)/signin/page.tsx`** – Convenience route that redirects to the main sign‑in page (`/`).
  - **`app/lobby/page.tsx`** – Authenticated lobby where players create or join games.
  - **`app/game/[gameId]/page.tsx`** – Redirector that sends players to either the waiting room or live gameplay based on `Game.status`.
  - **`app/game/[gameId]/waiting/page.tsx`** – Waiting room view, listing players and ready states.
  - **`app/game/[gameId]/play/page.tsx`** – Main gameplay view with the board, hand, and scores.
  - **`app/api/auth/[...nextauth]/route.ts`** – NextAuth handler wired up with the app’s Prisma adapter and credentials provider.
  - **`app/api/game/[gameId]/stream/route.ts`** – SSE endpoint that polls game state and pushes updates to connected clients.
- **`prisma/`** – Prisma schema and tooling:
  - **`prisma/schema.prisma`** – Models for `User`, `Account`, `Session`, `VerificationToken`, `Card`, `Game`, and `Player`.
  - **`prisma/seed.ts`** – Optional seed script (e.g., for populating initial cards/decks).
- **`actions/`** – Server actions for authentication and game logic (such as `createGame`, `joinGame`, `getGameState`, and `SignUp`).
- **`hooks/`** – Custom React hooks like `use-game-actions` for lobby flows (create / join game).
- **`lib/`** – Shared utilities:
  - **`lib/prisma.ts`** – Shared Prisma client.
  - **`lib/auth.ts`** – NextAuth configuration (`authOptions`).
  - **`lib/card-utils.ts`, `lib/game-field-utils.ts`, `lib/zod-schemas.ts`, `lib/errors.ts`, `lib/error-utils.ts`** – Helpers for card conversion, grid transformations, input validation, and error handling.
- **`components/`** – Reusable UI, including shadcn‑ui primitives (`button`, `input`, `card`, etc.) and app‑specific components (e.g. sign‑out button, gameplay / waiting room clients).

## Prerequisites

- **Node.js** – v18 or higher
- **npm** – v9 or higher (or a compatible package manager)
- **PostgreSQL** – local instance (default connection string assumes `localhost:5432`)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd demons-and-ducks
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

An `.env.example` is included with sane local defaults.

1. **Copy the example file:**

   ```bash
   cp .env.example .env
   ```

2. **Verify / update core values in `.env`:**

   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/demonsandducks?schema=public"
   AUTH_SECRET="generate-a-long-random-string"
   ```

- **`DATABASE_URL`**: Update username, password, port, and database name to match your local PostgreSQL setup.
- **`AUTH_SECRET`**: A long random string used by NextAuth. Generate one with `openssl rand -base64 32` or `npx auth secret`.
- For production, also set **`NEXTAUTH_URL`** (e.g. `https://your-domain.com`) so callbacks resolve correctly.

Environment files are git‑ignored by default.

### 4. Set up the database and Prisma

Run Prisma migrations to create the schema and generate the client:

```bash
npx prisma migrate dev --name init
npm run prisma:generate
```

To inspect or edit data locally with Prisma Studio:

```bash
npm run prisma:studio
```

Optionally, run the seed script if you have one configured (for example, to populate initial cards):

```bash
npm run prisma:seed
```

## Running the Project

### Development

Start the Next.js development server:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

- **`/signup`** – Create a new account (username + password).
- **`/`** – Sign‑in form using credentials; successful login redirects to `/lobby`.
- **`/lobby`** – Create a new game or join an existing one by game code.
- **`/game/[gameId]/waiting`** – Waiting room while players connect and ready up.
- **`/game/[gameId]/play`** – Live gameplay view.

### Production build

Build and start the app in production mode:

```bash
npm run build
npm start
```

By default this will also run on `http://localhost:3000` (configurable via environment variables).

## Available Scripts

At the root level:

- **`npm run dev`** – Start the Next.js dev server.
- **`npm run build`** – Create a production build.
- **`npm start`** – Start the production server (after `npm run build`).
- **`npm run lint`** – Run ESLint.
- **`npm run prisma:generate`** – Generate the Prisma client.
- **`npm run prisma:studio`** – Launch Prisma Studio for interactive DB management.
- **`npm run prisma:seed`** – Run the Prisma seed script (`prisma/seed.ts`).

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn‑ui, Radix UI primitives.
- **Auth:** NextAuth (credentials provider), bcryptjs, Prisma adapter.
- **Backend:** Next.js API routes and server actions, server‑sent events for real‑time game streaming.
- **Database:** PostgreSQL with Prisma ORM.
- **Validation & utilities:** Zod, custom error helpers, and typed game utilities for cards, grids, and phases.

## Troubleshooting

- **Database connection errors**
  - Confirm PostgreSQL is running and reachable at the host/port in `DATABASE_URL`.
  - Check that the database (`demonsandducks` by default) exists or re‑run `npx prisma migrate dev`.
  - If the schema has changed, rerun `npx prisma migrate dev` and `npm run prisma:generate`.

- **Prisma client issues**
  - Delete `.prisma` caches if needed and re‑run `npm run prisma:generate`.
  - Verify `DATABASE_URL` is set before running migrations or the dev server.

- **Authentication problems**
  - Ensure `AUTH_SECRET` is set and long/random enough.
  - For production, set `NEXTAUTH_URL` to the canonical HTTPS URL of your deployment.
  - Restart `npm run dev` after any environment variable changes.

## Contributing

1. **Create a feature branch.**
2. **Make your changes** (code, tests, and any schema updates).
3. **Run checks**:
   - `npm run lint`
   - `npm run build`
4. **Open a pull request** with a clear description of your changes and any schema or gameplay impact.

