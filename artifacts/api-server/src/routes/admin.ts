import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
router.use("/admin", requireAuth, requireAdmin);

router.get("/admin/users", async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      currency: usersTable.currency,
      billingStatus: usersTable.billingStatus,
      billingRenewalEnd: usersTable.billingRenewalEnd,
      billingCancelAtPeriodEnd: usersTable.billingCancelAtPeriodEnd,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);
  res.json({ users });
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable);
  const [auditCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogsTable);
  const today = new Date().toISOString().slice(0, 10);
  const [todayLogins] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogsTable)
    .where(
      sql`${auditLogsTable.action} = 'login' AND ${auditLogsTable.createdAt} >= ${today}::timestamp`,
    );
  res.json({
    userCount: Number(userCount?.count ?? 0),
    auditLogCount: Number(auditCount?.count ?? 0),
    todayLogins: Number(todayLogins?.count ?? 0),
  });
});

router.get("/admin/audit-log", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(sql`${auditLogsTable.createdAt} DESC`)
    .limit(limit);
  res.json({ logs });
});

export default router;
