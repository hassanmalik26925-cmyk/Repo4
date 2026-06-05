/**
 * Snapchat Marketing API v1 adapter.
 * Docs: https://marketingapi.snapchat.com/docs/
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, adCampaignsTable, adMetricsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const BASE = "https://adsapi.snapchat.com/v1";
const TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token";

interface SnapchatCreds extends Record<string, unknown> {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  adAccountId: string;
}

function isSnapchatCreds(c: Record<string, unknown>): c is SnapchatCreds {
  return (
    typeof c.clientId === "string" &&
    typeof c.clientSecret === "string" &&
    typeof c.refreshToken === "string" &&
    typeof c.organizationId === "string" &&
    typeof c.adAccountId === "string"
  );
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(creds: SnapchatCreds): Promise<string> {
  const key = creds.clientId;
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expiresAt - 30_000) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Snapchat OAuth ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1_000 });
  return data.access_token;
}

const limiter = new RateLimiter(5, 1_000);

async function snapFetch<T>(creds: SnapchatCreds, path: string): Promise<T> {
  await limiter.throttle();
  const token = await getToken(creds);
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (res.status === 429) { await sleep(5_000); return snapFetch(creds, path); }
  if (!res.ok) throw new Error(`Snapchat ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export const snapchatAdapter: IntegrationAdapter = {
  platform: "snapchat",
  displayName: "Snapchat Ads",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isSnapchatCreds(credentials))
      throw new Error("clientId, clientSecret, refreshToken, organizationId, and adAccountId are required");
    await getToken(credentials);
  },

  async sync(userId, credentials) {
    if (!isSnapchatCreds(credentials)) throw new Error("Invalid Snapchat credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const campsData = await withRetry("snapchat:campaigns", () =>
      snapFetch<{ campaigns: Array<{ campaign: { id: string; name: string; status: string } }> }>(
        credentials,
        `/adaccounts/${credentials.adAccountId}/campaigns`,
      )
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    for (const item of campsData.campaigns ?? []) {
      const c = item.campaign;
      const [row] = await db
        .insert(adCampaignsTable)
        .values({
          userId,
          channel: "snapchat",
          externalId: c.id,
          name: c.name,
          status: c.status?.toLowerCase() ?? "active",
        })
        .onConflictDoUpdate({
          target: [adCampaignsTable.userId, adCampaignsTable.channel, adCampaignsTable.externalId],
          set: { name: c.name, status: c.status?.toLowerCase() ?? "active" },
        })
        .returning({ id: adCampaignsTable.id });
      if (!row) continue;
      result.campaignsAdded += 1;

      const stats = await withRetry("snapchat:metrics", () =>
        snapFetch<{
          timeseries_stats: Array<{
            timeseries_stat: {
              timeseries: Array<{
                start_time: string;
                stats: { impressions: number; swipes: number; spend: number; conversions: number; total_revenue_micro_currency: number };
              }>;
            };
          }>;
        }>(
          credentials,
          `/campaigns/${c.id}/stats?granularity=DAY&start_time=${isoDate(startDate)}T00:00:00.000Z&end_time=${isoDate(endDate)}T23:59:59.000Z&fields=impressions,swipes,spend,conversions,total_revenue_micro_currency`,
        ).catch(() => ({ timeseries_stats: [] as any[] }))
      );

      for (const ts of (stats as any).timeseries_stats?.[0]?.timeseries_stat?.timeseries ?? []) {
        const date = ts.start_time?.slice(0, 10);
        if (!date) continue;
        const s = ts.stats ?? {};
        await db
          .insert(adMetricsTable)
          .values({
            userId,
            campaignId: row.id,
            date,
            spend: String(Number(s.spend ?? 0) / 1_000_000),
            impressions: Number(s.impressions ?? 0),
            clicks: Number(s.swipes ?? 0),
            conversions: Number(s.conversions ?? 0),
            revenue: String(Number(s.total_revenue_micro_currency ?? 0) / 1_000_000),
          })
          .onConflictDoUpdate({
            target: [adMetricsTable.campaignId, adMetricsTable.date],
            set: {
              spend: String(Number(s.spend ?? 0) / 1_000_000),
              impressions: Number(s.impressions ?? 0),
              clicks: Number(s.swipes ?? 0),
              conversions: Number(s.conversions ?? 0),
              revenue: String(Number(s.total_revenue_micro_currency ?? 0) / 1_000_000),
            },
          });
        result.metricsAdded += 1;
      }
    }

    logger.info({ userId, campaigns: result.campaignsAdded }, "Snapchat sync ok");
    return result;
  },
};
