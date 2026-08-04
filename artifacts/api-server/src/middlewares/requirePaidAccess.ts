import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getBillingStatus } from "../services/BillingService";

export async function requirePaidAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [user] = await db
    .select({
      isDemo: usersTable.isDemo,
      billingStatus: usersTable.billingStatus,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.sub));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.isDemo === "true") {
    next();
    return;
  }

  const billing = await getBillingStatus(req.user.sub);
  if (!billing.hasAccess) {
    res.status(402).json({
      error: "An active CommercePulse subscription is required to access analytics.",
      code: "SUBSCRIPTION_REQUIRED",
      billing,
    });
    return;
  }

  next();
}