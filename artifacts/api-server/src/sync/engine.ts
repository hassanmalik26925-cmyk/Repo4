import { and, eq, like } from "drizzle-orm";
import {
  db,
  integrationsTable,
  ordersTable,
  productsTable,
  customersTable,
  adCampaignsTable,
  adMetricsTable,
} from "@workspace/db";
import { decryptJson } from "../lib/crypto";
import { getAdapter } from "../integrations";
import { ActivityService } from "../services/ActivityService";
import { logger } from "../lib/logger";

const RETRY_LIMIT = 3;

/**
 * Delete all seed/demo rows for a user. Called the first time a real
 * integration successfully syncs so that demo data doesn't mix with live data.
 */
async function clearSeedData(userId: string): Promise<void> {
  const SEED = "seed-%";

  // Ad metrics belong to campaigns, delete campaigns first (cascade not guaranteed)
  const seedCampaigns = await db
    .select({ id: adCampaignsTable.id })
    .from(adCampaignsTable)
    .where(
      and(
        eq(adCampaignsTable.userId, userId),
        like(adCampaignsTable.externalId, SEED),
      ),
    );
  for (const c of seedCampaigns) {
    await db
      .delete(adMetricsTable)
      .where(eq(adMetricsTable.campaignId, c.id));
  }
  await db
    .delete(adCampaignsTable)
    .where(
      and(
        eq(adCampaignsTable.userId, userId),
        like(adCampaignsTable.externalId, SEED),
      ),
    );

  // Orders (seed orders span shopify/woocommerce/direct platforms)
  await db
    .delete(ordersTable)
    .where(
      and(
        eq(ordersTable.userId, userId),
        like(ordersTable.externalId, SEED),
      ),
    );

  // Customers
  await db
    .delete(customersTable)
    .where(
      and(
        eq(customersTable.userId, userId),
        like(customersTable.externalId, SEED),
      ),
    );

  // Products (seeded as platform "manual")
  await db
    .delete(productsTable)
    .where(
      and(
        eq(productsTable.userId, userId),
        like(productsTable.externalId, SEED),
      ),
    );

  logger.info({ userId }, "Seed demo data cleared");
}

/** Returns true if this user has any integration that has previously synced. */
async function hasEverSynced(userId: string): Promise<boolean> {
  const rows = await db
    .select({ lastSyncAt: integrationsTable.lastSyncAt })
    .from(integrationsTable)
    .where(eq(integrationsTable.userId, userId));
  return rows.some((r) => r.lastSyncAt !== null);
}

export async function runSyncFor(
  userId: string,
  platform: string,
): Promise<{ ok: boolean; error?: string }> {
  const [integration] = await db
    .select()
    .from(integrationsTable)
    .where(
      and(
        eq(integrationsTable.userId, userId),
        eq(integrationsTable.platform, platform),
      ),
    );
  if (!integration || integration.status !== "connected") {
    return { ok: false, error: "Not connected" };
  }
  const adapter = getAdapter(platform);
  if (!adapter || !integration.credentials) {
    return { ok: false, error: "No adapter or credentials" };
  }
  const creds = decryptJson<Record<string, unknown>>(integration.credentials);

  // Track whether this is the user's very first real sync
  const isFirstEverSync = !(await hasEverSynced(userId));
  const isFirstSyncForPlatform = integration.lastSyncAt === null;

  let attempt = 0;
  let lastErr: unknown;
  while (attempt < RETRY_LIMIT) {
    try {
      const r = await adapter.sync(userId, creds);

      // On the first real sync ever, wipe all seed/demo data so real data
      // is the only source of truth in the dashboard.
      if (isFirstEverSync || isFirstSyncForPlatform) {
        await clearSeedData(userId).catch((err) =>
          logger.warn({ err }, "clearSeedData failed (non-fatal)"),
        );
      }

      await db
        .update(integrationsTable)
        .set({
          lastSyncAt: new Date(),
          lastError: null,
          status: "connected",
        })
        .where(eq(integrationsTable.id, integration.id));
      await ActivityService.log({
        userId,
        type: "sync.completed",
        title: `${adapter.displayName} synced`,
        description: `${r.ordersAdded} orders · ${r.productsAdded} products · ${r.metricsAdded} ad metrics`,
        entityType: "integration",
        entityId: integration.id,
      });
      logger.info({ userId, platform, result: r }, "Sync ok");
      return { ok: true };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      logger.warn({ err, attempt, platform }, "Sync attempt failed");
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : "Sync failed";
  await db
    .update(integrationsTable)
    .set({ lastError: msg, status: "error" })
    .where(eq(integrationsTable.id, integration.id));
  await ActivityService.log({
    userId,
    type: "sync.failed",
    title: `${platform} sync failed`,
    description: msg,
    entityType: "integration",
    entityId: integration.id,
  });
  return { ok: false, error: msg };
}

let timer: NodeJS.Timeout | null = null;

export function startScheduler(intervalMinutes = 15): void {
  if (timer) return;
  const ms = intervalMinutes * 60 * 1000;
  const tick = async () => {
    try {
      const due = await db
        .select()
        .from(integrationsTable)
        .where(eq(integrationsTable.status, "connected"));
      for (const i of due) {
        await runSyncFor(i.userId, i.platform).catch((err) => {
          logger.error({ err, integrationId: i.id }, "Scheduled sync error");
        });
      }
    } catch (err) {
      logger.error({ err }, "Scheduler tick failed");
    }
  };
  timer = setInterval(tick, ms);
  logger.info({ intervalMinutes }, "Sync scheduler started");
}
