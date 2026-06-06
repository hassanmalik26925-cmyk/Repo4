import type { Request, Response, NextFunction } from "express";

interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

interface SchemaLike<T> {
  safeParse(input: unknown): SafeParseResult<T>;
}

export function validateBody<T>(schema: SchemaLike<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error?.message ?? "Invalid body" });
      return;
    }
    req.validatedBody = result.data;
    next();
  };
}

export function validateQuery<T>(schema: SchemaLike<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error?.message ?? "Invalid query" });
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
      validatedQuery?: unknown;
    }
  }
}
