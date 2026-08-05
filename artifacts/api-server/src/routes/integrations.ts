import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, integrationsTable } from "@workspace/db";
import {
  ListIntegrationsResponse,
  ConnectIntegrationBody,
  ConnectIntegrationResponse,
  DisconnectIntegrationResponse,
  SyncIntegrationResponse,
  GetIntegrationsHealthResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  SUPPORTED_PLATFORMS,
  PLATFORM_LABELS,
  getAdapter,
  type SupportedPlatform,
} from "../integrations";
import { encryptJson } from "../lib/crypto";
import { runSyncFor } from "../sync/engine";
import { ActivityService } from "../services/ActivityService";

const router: IRouter = Router();
router.use(requireAuth);

function shape(row: typeof integrationsTable.$inferSelect) {
  const adapter = getAdapter(row.platform);
  return {
    id: row.id,
    platform: row.platform,
    displayName: row.displayName,
    accountLabel: row.accountLabel,
    status: row.status,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastError: row.lastError,
    supportsCredentials: adapter?.requiresCredentials ?? false,
  };
}

router.get("/integrations", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const existing = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.userId, userId));
  const out = SUPPORTED_PLATFORMS.flatMap((platform) => {
    const found = existing.filter((i) => i.platform === platform);
    if (found.length) return found.map(shape);
    return [{
      id: `placeholder-${platform}`,
      platform,
      displayName: PLATFORM_LABELS[platform] ?? platform,
      accountLabel: "",
      status: "disconnected",
      lastSyncAt: null,
      lastError: null,
      supportsCredentials: getAdapter(platform)?.requiresCredentials ?? false,
    }];
  });
  res.json(ListIntegrationsResponse.parse(out));
});

router.post("/integrations/:platform/connect", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const platform = Array.isArray(req.params.platform)
    ? req.params.platform[0]!
    : req.params.platform;
  if (!SUPPORTED_PLATFORMS.includes(platform as SupportedPlatform)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }
  const parsed = ConnectIntegrationBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const adapter = getAdapter(platform);
  let encrypted: string | null = null;
  if (adapter?.requiresCredentials) {
    try {
      await adapter.validate(parsed.data as Record<string, unknown>);
      encrypted = encryptJson(parsed.data);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Validation failed",
      });
      return;
    }
  }
  const accountLabel =
    parsed.data.accountLabel?.trim() ||
    String(parsed.data.accountId ?? parsed.data.customerId ?? parsed.data.adAccountId ?? "").trim() ||
    `${PLATFORM_LABELS[platform] ?? platform} account`;
  const [row] = await db
    .insert(integrationsTable)
    .values({
      userId,
      platform,
      displayName: PLATFORM_LABELS[platform] ?? platform,
      accountLabel,
      status: "connected",
      credentials: encrypted,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to connect" });
    return;
  }
  await ActivityService.log({
    userId,
    type: "integration.connected",
    title: `${row.displayName} connected`,
    entityType: "integration",
    entityId: row.id,
  });
  res.json(ConnectIntegrationResponse.parse(shape(row)));
});

router.post("/integrations/:integrationId/disconnect", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const integrationId = Array.isArray(req.params.integrationId)
    ? req.params.integrationId[0]!
    : req.params.integrationId;

  // Demo accounts can toggle integrations connected/disconnected just like a
  // real account — the Settings UI reflects the real status either way. What
  // makes demo different is that all dashboards/pages keep showing sample
  // data regardless of connection status (see hasDemoData gating on the FE
  // and the fact that ProductService/RevenueService never filter by
  // integration status), so disconnecting never "breaks" the demo.
  const [row] = await db
    .update(integrationsTable)
    .set({ status: "disconnected", credentials: null })
    .where(
      and(
        eq(integrationsTable.userId, userId),
        eq(integrationsTable.id, integrationId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  await ActivityService.log({
    userId,
    type: "integration.disconnected",
    title: `${row.displayName} disconnected`,
    entityType: "integration",
    entityId: row.id,
  });
  res.json(DisconnectIntegrationResponse.parse(shape(row)));
});

router.post("/integrations/:integrationId/sync", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const integrationId = Array.isArray(req.params.integrationId)
    ? req.params.integrationId[0]!
    : req.params.integrationId;
  const [target] = await db
    .select()
    .from(integrationsTable)
    .where(and(eq(integrationsTable.id, integrationId), eq(integrationsTable.userId, userId)));
  if (!target) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  const result = await runSyncFor(userId, integrationId);
  if (!result.ok) {
    res.status(400).json({ error: result.error ?? "Sync failed" });
    return;
  }
  const [row] = await db
    .select()
    .from(integrationsTable)
    .where(
      and(
        eq(integrationsTable.userId, userId),
        eq(integrationsTable.id, integrationId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  res.json(SyncIntegrationResponse.parse(shape(row)));
});

router.get("/integrations/health", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.userId, userId));
  const items = rows.map((r) => ({
    platform: r.platform,
    status: r.status,
    lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
    lastError: r.lastError,
  }));
  const overall = items.some((i) => i.status === "error")
    ? "degraded"
    : items.some((i) => i.status === "connected")
      ? "healthy"
      : "idle";
  res.json(
    GetIntegrationsHealthResponse.parse({ overall, integrations: items }),
  );
});

export default router;
