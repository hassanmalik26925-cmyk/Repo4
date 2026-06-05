/**
 * Pinterest Ads API v5 adapter.
 * Syncs ad campaigns + daily metrics.
 * Docs: https://developers.pinterest.com/docs/api/v5/
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, adCampaignsTable, adMetricsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter } from "../lib/rateLimit";

const BASE = "https://api.pinterest.com/v5";

interface PinterestCreds extends Record<string, unknown> {
  accessToken: string;
  adAccountId: string;
}

function isPinterestCreds(c: Record<string, unknown>): c is PinterestCreds {
  return typeof c.accessToken === "string" && typeof c.adAccountId === "string";
}

const limiter = new RateLimiter(5, 1_000);

async function pinFetch<T>(
  creds: PinterestCreds,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  await limiter.throttle();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Pinterest ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const pinterestAdapter: IntegrationAdapter = {
  platform: "pinterest",
  displayName: "Pinterest Ads",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isPinterestCreds(credentials))
      throw new Error("accessToken and adAccountId are required");
    await pinFetch(credentials, `/ad_accounts/${credentials.adAccountId}`);
  },

  async sync(userId, credentials) {
    if (!isPinterestCreds(credentials)) throw new Error("Invalid Pinterest credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const camps = await withRetry("pinterest:campaigns", () =>
      pinFetch<{ items: Array<{ id: string; name: string; status: string }> }>(
        credentials,
        `/ad_accounts/${credentials.adAccountId}/campaigns`,
        { page_size: "100" },
      )
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    for (const c of camps.items ?? []) {
      const [row] = await db
        .insert(adCampaignsTable)
        .values({
          userId,
          channel: "pinterest",
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

      const analytics = await withRetry("pinterest:metrics", () =>
        pinFetch<{
          data: Array<{
            date: string;
            spend_in_dollar: number;
            impression: number;
            click: number;
            total_conversions: number;
            total_checkout_value: number;
          }>;
        }>(
          credentials,
          `/ad_accounts/${credentials.adAccountId}/campaigns/analytics`,
          {
            campaign_ids: c.id,
            start_date: isoDate(startDate),
            end_date: isoDate(endDate),
            columns: "SPEND_IN_DOLLAR,IMPRESSION_1,CLICK_1,TOTAL_CONVERSIONS,TOTAL_CHECKOUT_VALUE",
            granularity: "DAY",
          },
        ).catch(() => ({ data: [] as any[] }))
      );

      for (const m of (analytics as any).data ?? []) {
        const date: string = m.DATE ?? m.date ?? isoDate(new Date());
        await db
          .insert(adMetricsTable)
          .values({
            userId,
            campaignId: row.id,
            date,
            spend: String(Number(m.SPEND_IN_DOLLAR ?? m.spend_in_dollar ?? 0)),
            impressions: Number(m.IMPRESSION_1 ?? m.impression ?? 0),
            clicks: Number(m.CLICK_1 ?? m.click ?? 0),
            conversions: Number(m.TOTAL_CONVERSIONS ?? m.total_conversions ?? 0),
            revenue: String(Number(m.TOTAL_CHECKOUT_VALUE ?? m.total_checkout_value ?? 0)),
          })
          .onConflictDoUpdate({
            target: [adMetricsTable.campaignId, adMetricsTable.date],
            set: {
              spend: String(Number(m.SPEND_IN_DOLLAR ?? m.spend_in_dollar ?? 0)),
              impressions: Number(m.IMPRESSION_1 ?? m.impression ?? 0),
              clicks: Number(m.CLICK_1 ?? m.click ?? 0),
              conversions: Number(m.TOTAL_CONVERSIONS ?? m.total_conversions ?? 0),
              revenue: String(Number(m.TOTAL_CHECKOUT_VALUE ?? m.total_checkout_value ?? 0)),
            },
          });
        result.metricsAdded += 1;
      }
    }

    logger.info({ userId, campaigns: result.campaignsAdded }, "Pinterest sync ok");
    return result;
  },
};
