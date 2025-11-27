import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getUserByUserId } from "../lib/utilities/db";

const router = express.Router();

// GET endpoint to retrieve user by ID
router.get("/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const user = await getUserByUserId(userId);
        res.json({ user });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
