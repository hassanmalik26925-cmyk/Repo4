/**
 * Google Ads REST API v18 adapter.
 * Uses OAuth2 refresh-token flow + developer token.
 * Docs: https://developers.google.com/google-ads/api/docs/rest/overview
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, adCampaignsTable, adMetricsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const API_VERSION = "v18";
const REST_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface GoogleAdsCreds extends Record<string, unknown> {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string; // 10-digit, no hyphens
  loginCustomerId?: string; // MCC account, optional
}

function isGoogleAdsCreds(c: Record<string, unknown>): c is GoogleAdsCreds {
  return (
    typeof c.developerToken === "string" &&
    typeof c.clientId === "string" &&
    typeof c.clientSecret === "string" &&
    typeof c.refreshToken === "string" &&
    typeof c.customerId === "string"
  );
}

// ── Token management ──────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

async function getAccessToken(creds: GoogleAdsCreds): Promise<string> {
  const cacheKey = `${creds.clientId}:${creds.refreshToken}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - 30_000) {
    return cached.accessToken;
  }

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
  if (!res.ok) {
    throw new Error(`Google OAuth2 ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1_000,
  });
  return data.access_token;
}

// ── GAQL REST search ─────────────────────────────────────────────────────────

const limiter = new RateLimiter(10, 1_000);

async function gaqlSearch(creds: GoogleAdsCreds, query: string): Promise<any[]> {
  await limiter.throttle();
  const token = await getAccessToken(creds);
  const customerId = creds.customerId.replace(/-/g, "");
  const url = `${REST_BASE}/customers/${customerId}/googleAds:search`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": creds.developerToken,
    "Content-Type": "application/json",
  };
  if (creds.loginCustomerId) {
    headers["login-customer-id"] = creds.loginCustomerId.replace(/-/g, "");
  }

  const rows: any[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = { query };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      await sleep(5_000);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Google Ads ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { results?: any[]; nextPageToken?: string };
    rows.push(...(data.results ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return rows;
}

export const googleAdsAdapter: IntegrationAdapter = {
  platform: "google_ads",
  displayName: "Google Ads",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isGoogleAdsCreds(credentials))
      throw new Error("developerToken, clientId, clientSecret, refreshToken, and customerId are required");
    await getAccessToken(credentials);
  },

  async sync(userId, credentials) {
    if (!isGoogleAdsCreds(credentials)) throw new Error("Invalid Google Ads credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    // ── Campaigns ─────────────────────────────────────────────────────────────
    const campaignRows = await withRetry("google_ads:campaigns", () =>
      gaqlSearch(credentials, `
        SELECT campaign.id, campaign.name, campaign.status
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        LIMIT 500
      `)
    );

    for (const row of campaignRows) {
      const c = row.campaign;
      const [inserted] = await db
        .insert(adCampaignsTable)
        .values({
          userId,
          channel: "google",
          externalId: String(c.id),
          name: c.name,
          status: c.status?.toLowerCase() ?? "active",
        })
        .onConflictDoUpdate({
          target: [adCampaignsTable.userId, adCampaignsTable.channel, adCampaignsTable.externalId],
          set: { name: c.name, status: c.status?.toLowerCase() ?? "active" },
        })
        .returning({ id: adCampaignsTable.id });
      if (!inserted) continue;
      result.campaignsAdded += 1;

      // ── Daily metrics for this campaign (last 90 days) ────────────────────
      const metricRows = await withRetry("google_ads:metrics", () =>
        gaqlSearch(credentials, `
          SELECT
            campaign.id,
            segments.date,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.conversions_value
          FROM campaign
          WHERE campaign.id = ${String(c.id)}
            AND segments.date DURING LAST_90_DAYS
        `)
      );

      for (const mRow of metricRows) {
        const m = mRow.metrics;
        const date = mRow.segments?.date;
        if (!date) continue;
        await db
          .insert(adMetricsTable)
          .values({
            userId,
            campaignId: inserted.id,
            date,
            spend: String((Number(m.costMicros ?? 0)) / 1_000_000),
            impressions: Number(m.impressions ?? 0),
            clicks: Number(m.clicks ?? 0),
            conversions: Math.round(Number(m.conversions ?? 0)),
            revenue: String(Number(m.conversionsValue ?? 0)),
          })
          .onConflictDoUpdate({
            target: [adMetricsTable.campaignId, adMetricsTable.date],
            set: {
              spend: String((Number(m.costMicros ?? 0)) / 1_000_000),
              impressions: Number(m.impressions ?? 0),
              clicks: Number(m.clicks ?? 0),
              conversions: Math.round(Number(m.conversions ?? 0)),
              revenue: String(Number(m.conversionsValue ?? 0)),
            },
          });
        result.metricsAdded += 1;
      }
    }

    logger.info({ userId, campaigns: result.campaignsAdded, metrics: result.metricsAdded }, "Google Ads sync ok");
    return result;
  },
};
