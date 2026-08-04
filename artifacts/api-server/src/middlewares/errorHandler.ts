import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(
  err: Error & { status?: number; statusCode?: number; type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  // express.json/body-parser reports malformed JSON as a SyntaxError. This is
  // a client error, not an application failure, and should never be exposed as
  // a misleading 500.
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({ error: "Request body contains invalid JSON" });
    return;
  }

  const status = err.statusCode ?? err.status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: err.message || "Invalid request" });
    return;
  }

  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
