import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users";
import { UserSocketManager } from "./services";
import { RegisterUserSocketEvent, RegisterUserData } from "@shared-types";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";

const app = express();
app.use(cors());
app.use(express.json());

// Create server and io
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Creates the gameplay namespace that will handle all gameplay connections
const gameNamespace = io.of("/gameplay");

// Initialize services
const userSocketManager = UserSocketManager.getInstance();

// API routes
app.use("/api/users", usersRouter);

// Error handling middleware (must be last)
app.use(errorHandler as express.ErrorRequestHandler);

gameNamespace.on("connection", async (socket) => {
    socket.on("error", (error: Error) => {
        console.error("Socket error:", error);
    });

    // Extract userId from query parameters
    const userId = socket.handshake.query.userId as string;
    if (userId && userId !== 'undefined' && userId !== 'null') {
        userSocketManager.registerSocket(userId, socket);
        socket.emit(RegisterUserSocketEvent);
    } else {
        console.warn("Socket connected without userId in query parameters");
    }

    // Store socket ID and userId pair for REST API responses
    socket.on(RegisterUserSocketEvent, ({ userId }: RegisterUserData) => {
        userSocketManager.registerSocket(userId, socket);
        socket.emit(RegisterUserSocketEvent);
    });

    socket.on("disconnect", (reason) => {
        console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);
        userSocketManager.unregisterSocket(socket.id);
    });
});

// Start the server with Prisma
async function startServer() {
    try {
        // Test Prisma connection
        await prisma.$connect();
        console.debug("Connected to database via Prisma");

        // Start the server after successful database connection
        server.listen(env.PORT, async () => {
            console.debug(
                `WebSocket server running on http://localhost:${env.PORT}`
            );
        });
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("Shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("Shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
});

startServer();

export { server, io };
