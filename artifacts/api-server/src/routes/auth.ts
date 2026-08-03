import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterBody,
  LoginBody,
  LoginResponse,
  MeResponse,
} from "@workspace/api-zod";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { rateLimit } from "../middlewares/rateLimit";
import { seedDemoData, refreshDemoDataIfStale } from "../lib/seed";
import { ActivityService } from "../services/ActivityService";

const router: IRouter = Router();

router.post(
  "/auth/register",
  rateLimit({ windowMs: 60_000, max: 10 }),
  async (req, res): Promise<void> => {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { email, password, name } = parsed.data;
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalized));
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({
        email: normalized,
        name,
        passwordHash,
        isDemo: normalized === "demo@pulse.test" ? "true" : "false",
      })
      .returning();
    if (!user) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    // Only the designated demo account receives seeded analytics data.
    // Real accounts must begin empty and populate from a connected integration.
    if (user.isDemo === "true") {
      await seedDemoData(user.id);
    }

    const { token, expiresAt } = signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    res.status(201).json(
      LoginResponse.parse({
        token,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isDemo: user.isDemo === "true",
        },
      }),
    );
  },
);

router.post(
  "/auth/login",
  rateLimit({ windowMs: 60_000, max: 20 }),
  async (req, res): Promise<void> => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const normalized = parsed.data.email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalized));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (user.isDemo === "true") {
      await refreshDemoDataIfStale(user.id);
    }
    const { token, expiresAt } = signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await ActivityService.log({
      userId: user.id,
      type: "auth.login",
      title: "Signed in",
    });
    res.json(
      LoginResponse.parse({
        token,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isDemo: user.isDemo === "true",
        },
      }),
    );
  },
);

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }
  const [row] = await db
    .select({ isDemo: usersTable.isDemo })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.sub));
  res.json(
    MeResponse.parse({
      id: req.user.sub,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      isDemo: row?.isDemo === "true",
    }),
  );
});

export default router;
