// src/lib/server/auth.ts
import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginFormSchema } from "../zod-schemas";
import { compare } from "bcryptjs";

const config = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validation
        const validatedFormData = loginFormSchema.safeParse(credentials);
        if (!validatedFormData.success) return null;

        const { username, password } = validatedFormData.data;

        // Lazy import Prisma (Node environment only)
        const { prisma } = await import("./prisma");

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          console.error(`User ${username} not found`);
          return null;
        }

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
          console.error(`Invalid credentials`);
          return null;
        }

        // Don't really need to return password, but up to you
        return {
          id: user.id,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
        token.username = user.username;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // You should have module augmentation set up for this
      session.user.id = token.userId as string;
      session.user.username = token.username as string;

      return session;
    },
  },
} satisfies NextAuthConfig;

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(config);
