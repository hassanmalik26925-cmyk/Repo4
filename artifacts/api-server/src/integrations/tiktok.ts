/**
 * TikTok for Business (Marketing API v1.3) adapter.
 * Docs: https://ads.tiktok.com/marketing_api/docs
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, adCampaignsTable, adMetricsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter } from "../lib/rateLimit";

const BASE = "https://business-api.tiktok.com/open_api/v1.3";

interface TikTokCreds extends Record<string, unknown> {
  accessToken: string;
  advertiserId: string;
}

function isTikTokCreds(c: Record<string, unknown>): c is TikTokCreds {
  return typeof c.accessToken === "string" && typeof c.advertiserId === "string";
}

const limiter = new RateLimiter(10, 1_000);

async function tikFetch<T>(creds: TikTokCreds, path: string, params: Record<string, string | number> = {}): Promise<T> {
  await limiter.throttle();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), {
    headers: { "Access-Token": creds.accessToken, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`TikTok HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { code: number; message: string; data: T };
  if (data.code !== 0) throw new Error(`TikTok API ${data.code}: ${data.message}`);
  return data.data;
}

async function tikPost<T>(creds: TikTokCreds, path: string, body: unknown): Promise<T> {
  await limiter.throttle();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Access-Token": creds.accessToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TikTok HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { code: number; message: string; data: T };
  if (data.code !== 0) throw new Error(`TikTok API ${data.code}: ${data.message}`);
  return data.data;
}

function dateRange(days = 90): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export const tikTokAdapter: IntegrationAdapter = {
  platform: "tiktok",
  displayName: "TikTok Ads",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isTikTokCreds(credentials))
      throw new Error("accessToken and advertiserId are required");
    // Verify credentials by fetching advertiser info
    await tikFetch(credentials, "/advertiser/info/", {
      advertiser_ids: `["${credentials.advertiserId}"]`,
    });
  },

  async sync(userId, credentials) {
    if (!isTikTokCreds(credentials)) throw new Error("Invalid TikTok credentials");
    const result: SyncResult = { ...ZERO_SYNC };
    const integrationId = typeof credentials._integrationId === "string"
      ? credentials._integrationId
      : null;
    const { startDate, endDate } = dateRange(90);

    // ── Campaigns ─────────────────────────────────────────────────────────────
    const campData = await withRetry("tiktok:campaigns", () =>
      tikFetch<{ list: Array<{ campaign_id: string; campaign_name: string; operation_status: string }> }>(
        credentials,
        "/campaign/get/",
        { advertiser_id: credentials.advertiserId, page_size: 1000 },
      )
    );

    for (const c of campData.list ?? []) {
      const [row] = await db
        .insert(adCampaignsTable)
        .values({
          userId,
          integrationId,
          channel: "tiktok",
          externalId: c.campaign_id,
          name: c.campaign_name,
          status: c.operation_status?.toLowerCase() ?? "active",
        })
        .onConflictDoUpdate({
          target: [adCampaignsTable.userId, adCampaignsTable.channel, adCampaignsTable.externalId, adCampaignsTable.integrationId],
          set: { name: c.campaign_name, status: c.operation_status?.toLowerCase() ?? "active" },
        })
        .returning({ id: adCampaignsTable.id });
      if (!row) continue;
      result.campaignsAdded += 1;

      // ── Integrated report (daily metrics per campaign) ────────────────────
      const reportData = await withRetry("tiktok:metrics", () =>
        tikPost<{ list: Array<{ dimensions: { stat_time_day: string }; metrics: Record<string, string> }> }>(
          credentials,
          "/report/integrated/get/",
          {
            advertiser_id: credentials.advertiserId,
            report_type: "BASIC",
            data_level: "AUCTION_CAMPAIGN",
            dimensions: ["campaign_id", "stat_time_day"],
            metrics: ["spend", "impressions", "clicks", "conversion"],
            filters: [{ filter_value: `["${c.campaign_id}"]`, field_name: "campaign_ids", filter_type: "IN" }],
            start_date: startDate,
            end_date: endDate,
            page_size: 1000,
          },
        )
      );

      for (const r of reportData.list ?? []) {
        const m = r.metrics;
        const date = r.dimensions?.stat_time_day?.slice(0, 10);
        if (!date) continue;
        await db
          .insert(adMetricsTable)
          .values({
            userId,
            campaignId: row.id,
            date,
            spend: m.spend ?? "0",
            impressions: Number(m.impressions ?? 0),
            clicks: Number(m.clicks ?? 0),
            conversions: Number(m.conversion ?? 0),
            revenue: "0",
          })
          .onConflictDoUpdate({
            target: [adMetricsTable.campaignId, adMetricsTable.date],
            set: {
              spend: m.spend ?? "0",
              impressions: Number(m.impressions ?? 0),
              clicks: Number(m.clicks ?? 0),
              conversions: Number(m.conversion ?? 0),
            },
          });
        result.metricsAdded += 1;
      }
    }

    logger.info({ userId, campaigns: result.campaignsAdded, metrics: result.metricsAdded }, "TikTok sync ok");
    return result;
  },
};
