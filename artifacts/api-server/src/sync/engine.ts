import { and, eq } from "drizzle-orm";
import { db, integrationsTable } from "@workspace/db";
import { decryptJson } from "../lib/crypto";
import { getAdapter } from "../integrations";
import { ActivityService } from "../services/ActivityService";
import { logger } from "../lib/logger";

const RETRY_LIMIT = 3;

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

  let attempt = 0;
  let lastErr: unknown;
  while (attempt < RETRY_LIMIT) {
    try {
      const r = await adapter.sync(userId, creds);
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
