import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "./prisma";
import { normalizeUsername } from "./utils";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const username = credentials?.username;
          const password = credentials?.password;

          if (!username || !password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { username: normalizeUsername(username) },
          });

          if (!user?.passwordHash) {
            return null;
          }

          const passwordMatches = await compare(password, user.passwordHash);

          if (!passwordMatches) {
            return null;
          }

          return {
            id: `${user.id}`,
            username: user.username,
          };
        } catch (error) {
          console.error("[authorize] unexpected error", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as { username?: string }).username;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.username = (token as { username?: string }).username ?? null;
        session.user.id = token.sub ?? session.user.id;
      }

      return session;
    },
  },
};

