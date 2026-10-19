
import { Response, Request, NextFunction } from "express";
import { logServerError } from "../services/devtools.service";

export interface IAuthError {
    statusCode: number;
    code: string;
    message: string;
}
export class AuthError extends Error implements IAuthError {
    statusCode: number;
    code: string;

    constructor(error: IAuthError) {
        super(error.message);
        this.statusCode = error.statusCode;
        this.code = error.code;

        Object.setPrototypeOf(this, AuthError.prototype);
    }
}

export const AuthErrorCodes = {
    InvalidCredentials: {
        statusCode: 400,
        code: "AUTH_001",
        message: "Invalid ID number or password.",
    },
    AccountSuspended: {
        statusCode: 403,
        code: "AUTH_002",
        message: "Your account has been suspended. Please contact a PSITS officer.",
    },
    AccountNotActive: {
        statusCode: 403,
        code: "AUTH_003",
        message: "This account is not active.",
    },
    AccountDeleted: {
        statusCode: 403,
        code: "AUTH_004",
        message: "This account has been deleted.",
    },
    TokenNotFound: {
        statusCode: 401,
        code: "AUTH_005",
        message: "Authentication token not found.",
    },
    InvalidToken: {
        statusCode: 401,
        code: "AUTH_006",
        message: "Authentication token is invalid or has expired.",
    },
    AccountNoLongerActive: {
        statusCode: 403,
        code: "AUTH_007",
        message: "This account is no longer active.",
    },
    TokenInvalidated: {
        statusCode: 401,
        code: "AUTH_008",
        message: "Session has been invalidated due to a security concern. Please log in again.",
    },
    GenericLoginError: {
        statusCode: 500,
        code: "AUTH_999",
        message: "An unexpected error occurred during login."
    }
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Skip console noise for expected auth errors on the refresh endpoint.
    // AuthProvider calls refresh on every mount; unauthenticated users have no cookie,
    // so this 401 is normal and must not pollute server logs.
    const isExpectedRefreshMiss =
        err instanceof AuthError &&
        err.code === "AUTH_005" &&
        req.path?.includes("/auth/refresh");

    if (!isExpectedRefreshMiss) {
        console.error("Error Handler:", err);
    }

    if (err instanceof AuthError) {
        return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
        });
    }

    const operationalError = err as Error & {
        statusCode?: number;
        isOperational?: boolean;
    };

    if (operationalError.isOperational && operationalError.statusCode) {
        if (operationalError.statusCode >= 500) {
            logServerError(err, req);
        }
        return res.status(operationalError.statusCode).json({
            message: operationalError.message,
        });
    }

    // Handle other errors (e.g. Mongoose validation) here in the future

    // This handler always responds, so globalErrorHandler never runs after it.
    // Record unexpected failures here so the Devtools server error log sees them.
    logServerError(err, req);

    return res.status(500).json({
        code: "SERVER_001",
        message: "An internal server error occurred.",
    });
};
