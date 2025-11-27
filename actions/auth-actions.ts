"use server";

import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/zod-schemas";
import { normalizeUsername, normalizeEmail } from "@/lib/utils";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";

type ActionResult = {
  error?: string;
  success?: boolean;
  username?: string;
  password?: string;
};

export async function SignUp(prevState: unknown, formData: FormData): Promise<ActionResult> {
  try {
    const formDataEntries = Object.fromEntries(formData.entries());
    
    const validatedFormData = signupSchema.safeParse(formDataEntries);
    if (!validatedFormData.success) {
      const firstError = validatedFormData.error.issues[0];
      return { error: firstError?.message ?? "Invalid form data" };
    }

    const { username, password, name, email } = validatedFormData.data;
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = email ? normalizeEmail(email) : null;

    const passwordHash = await hash(password, 10);

    await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        name: name?.trim() || null,
        email: normalizedEmail,
      },
    });

    return { success: true, username: normalizedUsername, password };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Username or email already in use" };
    }
    console.error("[SignUp] unexpected error", error);
    return { error: "Could not create user" };
  }
}

