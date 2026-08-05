/**
 * Microsoft Advertising (Bing Ads) REST API adapter.
 * Uses OAuth2 + Customer Management + Reporting APIs.
 * Docs: https://learn.microsoft.com/en-us/advertising/guides/
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, adCampaignsTable, adMetricsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const API_BASE = "https://api.ads.microsoft.com/v13/campaigns";

interface MicrosoftAdsCreds extends Record<string, unknown> {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  accountId: string;
  developerToken: string;
}

function isMicrosoftAdsCreds(c: Record<string, unknown>): c is MicrosoftAdsCreds {
  return (
    typeof c.clientId === "string" &&
    typeof c.clientSecret === "string" &&
    typeof c.refreshToken === "string" &&
    typeof c.customerId === "string" &&
    typeof c.accountId === "string" &&
    typeof c.developerToken === "string"
  );
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(creds: MicrosoftAdsCreds): Promise<string> {
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
      scope: "https://ads.microsoft.com/msads.manage",
    }),
  });
  if (!res.ok) throw new Error(`Microsoft OAuth ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1_000 });
  return data.access_token;
}

const limiter = new RateLimiter(5, 1_000);

async function msFetch<T>(creds: MicrosoftAdsCreds, url: string, body: unknown): Promise<T> {
  await limiter.throttle();
  const token = await getToken(creds);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      DeveloperToken: creds.developerToken,
      CustomerId: creds.customerId,
      CustomerAccountId: creds.accountId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) { await sleep(5_000); return msFetch(creds, url, body); }
  if (!res.ok) throw new Error(`Microsoft Ads ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export const microsoftAdsAdapter: IntegrationAdapter = {
  platform: "microsoft_ads",
  displayName: "Microsoft Ads",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isMicrosoftAdsCreds(credentials))
      throw new Error("clientId, clientSecret, refreshToken, customerId, accountId, developerToken required");
    await getToken(credentials);
  },

  async sync(userId, credentials) {
    if (!isMicrosoftAdsCreds(credentials)) throw new Error("Invalid Microsoft Ads credentials");
    const result: SyncResult = { ...ZERO_SYNC };
    const integrationId = typeof credentials._integrationId === "string"
      ? credentials._integrationId
      : null;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    // Get campaigns via Campaign Management API
    const campsResp = await withRetry("msads:campaigns", () =>
      msFetch<{
        Campaigns?: Array<{ Id: number; Name: string; Status: string }>;
      }>(
        credentials,
        "https://campaign.api.bingads.microsoft.com/Api/Advertiser/CampaignManagement/v13/CampaignManagementService.svc/json/GetCampaignsByAccountId",
        { AccountId: Number(credentials.accountId), CampaignType: "Search" },
      ).catch(() => ({ Campaigns: [] as any[] }))
    );

    for (const c of (campsResp as any).Campaigns ?? []) {
      const [row] = await db
        .insert(adCampaignsTable)
        .values({
          userId,
          integrationId,
          channel: "microsoft",
          externalId: String(c.Id),
          name: c.Name,
          status: c.Status?.toLowerCase() ?? "active",
        })
        .onConflictDoUpdate({
          target: [adCampaignsTable.userId, adCampaignsTable.channel, adCampaignsTable.externalId, adCampaignsTable.integrationId],
          set: { name: c.Name, status: c.Status?.toLowerCase() ?? "active" },
        })
        .returning({ id: adCampaignsTable.id });
      if (!row) continue;
      result.campaignsAdded += 1;

      // Reporting API for metrics
      const reportResp = await withRetry("msads:metrics", () =>
        msFetch<{ Rows?: Array<{ TimePeriod: string; Spend: number; Impressions: number; Clicks: number; Conversions: number; Revenue: number }> }>(
          credentials,
          "https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/V13/ReportingService.svc/json/SubmitGenerateReportAsync",
          {
            ReportRequest: {
              __type: "CampaignPerformanceReportRequest",
              Aggregation: "Daily",
              Columns: ["TimePeriod", "Spend", "Impressions", "Clicks", "Conversions", "Revenue"],
              Filter: { CampaignIds: [c.Id] },
              Scope: { AccountIds: [Number(credentials.accountId)], Campaigns: [] },
              Time: {
                CustomDateRangeStart: { Day: startDate.getDate(), Month: startDate.getMonth() + 1, Year: startDate.getFullYear() },
                CustomDateRangeEnd: { Day: endDate.getDate(), Month: endDate.getMonth() + 1, Year: endDate.getFullYear() },
              },
            },
          },
        ).catch(() => ({ Rows: [] as any[] }))
      );

      for (const m of (reportResp as any).Rows ?? []) {
        const date = m.TimePeriod?.slice(0, 10) ?? isoDate(new Date());
        await db
          .insert(adMetricsTable)
          .values({
            userId,
            campaignId: row.id,
            date,
            spend: String(Number(m.Spend ?? 0)),
            impressions: Number(m.Impressions ?? 0),
            clicks: Number(m.Clicks ?? 0),
            conversions: Number(m.Conversions ?? 0),
            revenue: String(Number(m.Revenue ?? 0)),
          })
          .onConflictDoUpdate({
            target: [adMetricsTable.campaignId, adMetricsTable.date],
            set: {
              spend: String(Number(m.Spend ?? 0)),
              impressions: Number(m.Impressions ?? 0),
              clicks: Number(m.Clicks ?? 0),
              conversions: Number(m.Conversions ?? 0),
              revenue: String(Number(m.Revenue ?? 0)),
            },
          });
        result.metricsAdded += 1;
      }
    }

    logger.info({ userId, campaigns: result.campaignsAdded }, "Microsoft Ads sync ok");
    return result;
  },
};
