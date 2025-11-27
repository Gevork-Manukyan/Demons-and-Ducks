import { z } from "zod";

// Socket event names
export const RegisterUserSocketEvent = "register-user-socket";

// Basic socket event registration schema
export const registerUserSocketSchema = z.object({
    userId: z.string(),
});

export type RegisterUserData = z.infer<typeof registerUserSocketSchema>;
