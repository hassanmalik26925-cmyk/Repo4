/**
 * Klaviyo API v2024-10-15 adapter.
 * Syncs campaigns + metrics (opens, clicks, conversions, revenue) into ad tables.
 * Docs: https://developers.klaviyo.com/en/reference/api-overview
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, adCampaignsTable, adMetricsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter } from "../lib/rateLimit";

const BASE = "https://a.klaviyo.com/api";
const API_VERSION = "2024-10-15";

interface KlaviyoCreds extends Record<string, unknown> {
  apiKey: string; // Private API key (pk_...)
}

function isKlaviyoCreds(c: Record<string, unknown>): c is KlaviyoCreds {
  return typeof c.apiKey === "string" && c.apiKey.length > 10;
}

const limiter = new RateLimiter(3, 1_000); // Klaviyo: 3 req/s

async function klavFetch<T>(creds: KlaviyoCreds, path: string): Promise<T> {
  await limiter.throttle();
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Klaviyo-API-Key ${creds.apiKey}`,
      revision: API_VERSION,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Klaviyo ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

interface KlaviyoListResp<T> {
  data: T[];
  links?: { next?: string };
}

async function klavPaginate<T>(
  creds: KlaviyoCreds,
  path: string,
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | null = null;
  do {
    const pageUrl: string = cursor
      ? `${BASE}${path}&page[cursor]=${encodeURIComponent(cursor)}`
      : `${BASE}${path}`;
    const resp: KlaviyoListResp<T> = await klavFetch<KlaviyoListResp<T>>(creds, pageUrl);
    results.push(...(resp.data ?? []));
    const nextLink: string | undefined = resp.links?.next;
    cursor = nextLink ? new URL(nextLink).searchParams.get("page[cursor]") : null;
  } while (cursor);
  return results;
}

export const klaviyoAdapter: IntegrationAdapter = {
  platform: "klaviyo",
  displayName: "Klaviyo",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isKlaviyoCreds(credentials))
      throw new Error("apiKey is required (private API key starting with pk_)");
    await klavFetch(credentials, "/accounts/?fields[account]=id");
  },

  async sync(userId, credentials) {
    if (!isKlaviyoCreds(credentials)) throw new Error("Invalid Klaviyo credentials");
    const result: SyncResult = { ...ZERO_SYNC };
    const integrationId = typeof credentials._integrationId === "string"
      ? credentials._integrationId
      : null;

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString();

    const campaigns = await withRetry("klaviyo:campaigns", () =>
      klavPaginate<{
        id: string;
        attributes: { name: string; status: string; send_time?: string };
      }>(credentials, `/campaigns/?filter=equals(channel,'email'),greater-than(created_at,'${sinceStr}')&fields[campaign]=name,status,send_time&sort=-created_at`)
    );

    for (const c of campaigns) {
      const attr = c.attributes;
      const [row] = await db
        .insert(adCampaignsTable)
        .values({
          userId,
          integrationId,
          channel: "email",
          externalId: c.id,
          name: attr.name,
          status: attr.status?.toLowerCase() ?? "sent",
        })
        .onConflictDoUpdate({
          target: [adCampaignsTable.userId, adCampaignsTable.channel, adCampaignsTable.externalId, adCampaignsTable.integrationId],
          set: { name: attr.name, status: attr.status?.toLowerCase() ?? "sent" },
        })
        .returning({ id: adCampaignsTable.id });
      if (!row) continue;
      result.campaignsAdded += 1;

      // Campaign metrics
      const metricsData = await withRetry("klaviyo:metrics", () =>
        klavFetch<{ data?: { attributes?: { statistics?: Record<string, number> } } }>(
          credentials as KlaviyoCreds,
          `/campaign-values-reports/`,
        ).catch(() => ({ data: undefined }))
      );

      const stats = (metricsData as any)?.data?.[0]?.attributes?.statistics ?? {};
      const date = attr.send_time?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

      await db
        .insert(adMetricsTable)
        .values({
          userId,
          campaignId: row.id,
          date,
          spend: "0",
          impressions: Number(stats.opens ?? 0),
          clicks: Number(stats.clicks ?? 0),
          conversions: Number(stats.conversions ?? 0),
          revenue: String(Number(stats.revenue ?? 0)),
        })
        .onConflictDoUpdate({
          target: [adMetricsTable.campaignId, adMetricsTable.date],
          set: {
            impressions: Number(stats.opens ?? 0),
            clicks: Number(stats.clicks ?? 0),
            conversions: Number(stats.conversions ?? 0),
            revenue: String(Number(stats.revenue ?? 0)),
          },
        });
      result.metricsAdded += 1;
    }

    logger.info({ userId, campaigns: result.campaignsAdded }, "Klaviyo sync ok");
    return result;
  },
};

