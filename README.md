This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Prisma + PostgreSQL

1. Copy `.env.example` to `.env`; it already contains the local default `postgresql://postgres:grMgan25!@localhost:5432/demonsandducks?schema=public`, so adjust only if your credentials differ.
2. Install dependencies (already included) and generate the client when the schema changes:

   ```bash
   npm run prisma:generate
   ```

3. After defining models in `prisma/schema.prisma`, you can sync with the existing database via `npx prisma db pull` or create migrations with `npx prisma migrate dev`.
4. Inspect/edit data locally with Prisma Studio:

   ```bash
   npm run prisma:studio
   ```

`DATABASE_URL` stays in `.env`, which is git-ignored by default. See `lib/prisma.ts` for the shared Prisma client used throughout the app.

## Authentication Environment

Create a `.env` file (or extend your existing one) with the values NextAuth expects:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/demonsandducks?schema=public"
AUTH_SECRET="generate-a-long-random-string"
```

- `AUTH_SECRET` secures sessions and should be at least 32 random bytes. You can generate one with `openssl rand -base64 32` or `npx auth secret`.
- When deploying, also set `NEXTAUTH_URL` (e.g., `https://your-domain.com`) so callback URLs resolve correctly.

After updating env vars, restart `npm run dev` to ensure the new configuration is picked up.

## Credentials Auth Flow

1. Apply the latest schema changes with Prisma once your database is reachable:

   ```bash
   npx prisma migrate dev --name add-auth
   ```

2. Start the dev server (`npm run dev`) and visit:
   - `/signup` to create the first user (username + password, optional name/email).
   - `/signin` to log into an existing account.

   These forms talk to `/api/auth/register` and the built-in NextAuth route under `/api/auth/[...nextauth]`.
3. The landing page (`/`) reflects the current session—showing the username plus a sign-out button when authenticated, or links to sign in/up when anonymous.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
