import { Request, Response, NextFunction } from "express";
import { ValidationError, NotFoundError, ConflictError, CustomError } from "../custom-errors";

export interface ApiError extends Error {
    status?: number;
    code?: string;
    field?: string;
}

export function errorHandler(
    err: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Handle specific error types
    if (err instanceof ValidationError) {
        return res.status(err.status).json({
            error: "Validation Error",
            message: err.message,
            code: err.code,
            field: err.field,
        });
    }

    if (err instanceof NotFoundError) {
        return res.status(err.status).json({
            error: "Not Found",
            message: err.message,
            code: err.code,
        });
    }

    if (err instanceof ConflictError) {
        return res.status(err.status).json({
            error: "Conflict",
            message: err.message,
            code: err.code,
        });
    }

    // Default error
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({
        error: "Server Error",
        message,
        code: err.code,
        field: err.field,
    });
}
