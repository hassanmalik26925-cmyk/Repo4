import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET is required for auth");
}

const JWT_SECRET: string = SECRET;
const JWT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: JwtPayload): {
  token: string;
  expiresAt: string;
} {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL_SECONDS });
  const expiresAt = new Date(Date.now() + JWT_TTL_SECONDS * 1000).toISOString();
  return { token, expiresAt };
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Invalid token");
  }
  return decoded as unknown as JwtPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
