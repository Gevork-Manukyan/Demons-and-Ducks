import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  type AppSessionUser = DefaultSession["user"] & {
    id: string;
    username: string | null;
  };

  interface Session {
    user: AppSessionUser;
  }

  interface User {
    id: string;
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null;
  }
}

