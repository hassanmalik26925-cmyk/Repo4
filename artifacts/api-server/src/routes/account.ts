import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  activitiesTable,
  adCampaignsTable,
  adMetricsTable,
  adSetMetricsTable,
  adSetsTable,
  adCreativesTable,
  creativeMetricsTable,
  auditLogsTable,
  customersTable,
  integrationsTable,
  notificationsTable,
  ordersTable,
  productsTable,
  resetTokensTable,
  shippingRatesTable,
  trafficEventsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { rateLimit } from "../middlewares/rateLimit";
import { AuditService } from "../services/AuditService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/account/export", rateLimit({ windowMs: 60_000, max: 5 }), async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [
    [user],
    integrations,
    customers,
    products,
    orders,
    campaigns,
    adSets,
    adMetrics,
    adSetMetrics,
    creatives,
    creativeMetrics,
    shippingRates,
    activities,
    notifications,
    auditLogs,
    trafficEvents,
  ] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)),
    db.select().from(integrationsTable).where(eq(integrationsTable.userId, userId)),
    db.select().from(customersTable).where(eq(customersTable.userId, userId)),
    db.select().from(productsTable).where(eq(productsTable.userId, userId)),
    db.select().from(ordersTable).where(eq(ordersTable.userId, userId)),
    db.select().from(adCampaignsTable).where(eq(adCampaignsTable.userId, userId)),
    db.select().from(adSetsTable).where(eq(adSetsTable.userId, userId)),
    db.select().from(adMetricsTable).where(eq(adMetricsTable.userId, userId)),
    db.select().from(adSetMetricsTable).where(eq(adSetMetricsTable.userId, userId)),
    db.select().from(adCreativesTable).where(eq(adCreativesTable.userId, userId)),
    db.select().from(creativeMetricsTable).where(eq(creativeMetricsTable.userId, userId)),
    db.select().from(shippingRatesTable).where(eq(shippingRatesTable.userId, userId)),
    db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId)),
    db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)),
    db.select().from(auditLogsTable).where(eq(auditLogsTable.userId, userId)),
    db.select().from(trafficEventsTable).where(eq(trafficEventsTable.userId, userId)),
  ]);

  await AuditService.log({
    userId,
    action: "data_export",
    resource: "account",
    resourceId: userId,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="commercepulse-account-data.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    account: user ? { ...user, passwordHash: undefined } : null,
    integrations: integrations.map(({ credentials: _credentials, ...safe }) => safe),
    customers,
    products,
    orders,
    campaigns,
    adSets,
    adMetrics,
    adSetMetrics,
    creatives,
    creativeMetrics,
    shippingRates,
    activities,
    notifications,
    auditLogs,
    trafficEvents,
  });
});

router.delete("/account", rateLimit({ windowMs: 60_000, max: 3 }), async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  await db.transaction(async (tx) => {
    await tx.delete(resetTokensTable).where(eq(resetTokensTable.userId, userId));
    await tx.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
    await tx.delete(auditLogsTable).where(eq(auditLogsTable.userId, userId));
    await tx.insert(auditLogsTable).values({
      userId: null,
      action: "account_delete",
      resource: "account",
      resourceId: userId,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      details: JSON.stringify({ deletedUserId: userId }),
    });
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
  res.status(204).send();
});

export default router;