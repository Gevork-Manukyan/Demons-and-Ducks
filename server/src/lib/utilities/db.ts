import { NotFoundError } from "../../custom-errors";
import { prisma } from "../prisma";
import { User } from "@prisma/client";

export async function getUserByUserId(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) {
        throw new NotFoundError("User", "User not found");
    }

    return user;
}