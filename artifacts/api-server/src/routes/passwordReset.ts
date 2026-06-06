import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, resetTokensTable } from "@workspace/db";
import { randomBytes } from "crypto";
import { hashPassword } from "../lib/auth";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

router.post(
  "/auth/forgot-password",
  rateLimit({ windowMs: 60_000, max: 5 }),
  async (req, res): Promise<void> => {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalized));
    if (!user) {
      res.json({ message: "If an account exists, a reset link was sent" });
      return;
    }
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db
      .insert(resetTokensTable)
      .values({
        userId: user.id,
        token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: resetTokensTable.userId,
        set: { token, expiresAt, used: "false" },
      });
    // In production, send email here with nodemailer
    res.json({
      message: "If an account exists, a reset link was sent",
      // Only include token in development for testing
      ...(process.env.NODE_ENV === "development" && { token }),
    });
  },
);

router.post(
  "/auth/reset-password",
  rateLimit({ windowMs: 60_000, max: 10 }),
  async (req, res): Promise<void> => {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };
    if (!token || !password || password.length < 6) {
      res.status(400).json({ error: "Valid token and password (6+ chars) required" });
      return;
    }
    const [row] = await db
      .select()
      .from(resetTokensTable)
      .where(eq(resetTokensTable.token, token));
    if (!row || row.used === "true" || new Date(row.expiresAt) < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, row.userId));
    await db
      .update(resetTokensTable)
      .set({ used: "true" })
      .where(eq(resetTokensTable.id, row.id));
    res.json({ message: "Password reset successfully" });
  },
);

export default router;
