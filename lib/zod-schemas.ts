import { z } from "zod";

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

