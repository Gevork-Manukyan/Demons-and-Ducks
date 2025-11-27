"use server";

import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/zod-schemas";
import { normalizeUsername } from "@/lib/utils";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import {
  ActionResult,
  actionSuccess,
  actionError,
} from "@/lib/errors";
import { ERROR_CODES } from "@/lib/error-codes";

type SignUpData = {
  username: string;
  password: string;
};

export async function SignUp(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<SignUpData>> {
  try {
    const formDataEntries = Object.fromEntries(formData.entries());

    const validatedFormData = signupSchema.safeParse(formDataEntries);
    if (!validatedFormData.success) {
      const firstError = validatedFormData.error.issues[0];
      return actionError(
        firstError?.message ?? "Invalid form data",
        ERROR_CODES.VALIDATION_ERROR,
        firstError?.path?.[0]?.toString()
      );
    }

    const { username, password } = validatedFormData.data;
    const normalizedUsername = normalizeUsername(username);

    const passwordHash = await hash(password, 10);

    await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
      },
    });

    return actionSuccess({
      username: normalizedUsername,
      password,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return actionError(
        "Username already in use",
        ERROR_CODES.ALREADY_EXISTS
      );
    }
    console.error("[SignUp] unexpected error", error);
    return actionError("Could not create user", ERROR_CODES.UNKNOWN_ERROR);
  }
}

