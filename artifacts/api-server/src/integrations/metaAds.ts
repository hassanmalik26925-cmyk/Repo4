import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import {
  db,
  adCampaignsTable,
  adMetricsTable,
  adSetsTable,
  adSetMetricsTable,
  adCreativesTable,
  creativeMetricsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

interface MetaCreds extends Record<string, unknown> {
  accessToken: string;
  accountId: string;
}

function isMetaCreds(c: Record<string, unknown>): c is MetaCreds {
  return typeof c.accessToken === "string" && typeof c.accountId === "string";
}

async function metaFetch<T>(creds: MetaCreds, path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://graph.facebook.com/v19.0${path}${sep}access_token=${encodeURIComponent(
    creds.accessToken,
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Meta ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export const metaAdsAdapter: IntegrationAdapter = {
  platform: "meta_ads",
  displayName: "Meta Ads",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isMetaCreds(credentials)) {
      throw new Error("accessToken and accountId are required");
    }
    await metaFetch(credentials, `/${credentials.accountId}?fields=id,name`);
  },

  async sync(userId, credentials) {
    if (!isMetaCreds(credentials)) {
      throw new Error("Invalid Meta credentials");
    }
    const result: SyncResult = { ...ZERO_SYNC };
    try {
      const campData = await metaFetch<{
        data: Array<{ id: string; name: string; status: string }>;
      }>(credentials, `/${credentials.accountId}/campaigns?fields=id,name,status&limit=25`);

      for (const c of campData.data) {
        const [row] = await db
          .insert(adCampaignsTable)
          .values({
            userId,
            channel: "meta",
            externalId: c.id,
            name: c.name,
            status: c.status.toLowerCase(),
          })
          .onConflictDoUpdate({
            target: [
              adCampaignsTable.userId,
              adCampaignsTable.channel,
              adCampaignsTable.externalId,
            ],
            set: { name: c.name, status: c.status.toLowerCase() },
          })
          .returning({ id: adCampaignsTable.id });
        if (!row) continue;
        result.campaignsAdded += 1;

        const adSetData = await metaFetch<{
          data: Array<{ id: string; name: string; status: string }>;
        }>(credentials, `/${c.id}/adsets?fields=id,name,status&limit=100`);

        for (const adSet of adSetData.data ?? []) {
          const [adSetRow] = await db
            .insert(adSetsTable)
            .values({
              userId,
              campaignId: row.id,
              channel: "meta",
              externalId: adSet.id,
              name: adSet.name,
              status: adSet.status?.toLowerCase() ?? "active",
            })
            .onConflictDoUpdate({
              target: [adSetsTable.userId, adSetsTable.channel, adSetsTable.externalId],
              set: { name: adSet.name, status: adSet.status?.toLowerCase() ?? "active", campaignId: row.id },
            })
            .returning({ id: adSetsTable.id });
          if (!adSetRow) continue;

          const adSetInsights = await metaFetch<{
            data: Array<{
              date_start: string;
              spend: string;
              impressions: string;
              clicks: string;
              actions?: Array<{ action_type: string; value: string }>;
              action_values?: Array<{ action_type: string; value: string }>;
            }>;
          }>(
            credentials,
            `/${adSet.id}/insights?fields=spend,impressions,clicks,actions,action_values&time_increment=1&date_preset=last_30d`,
          );
          for (const m of adSetInsights.data ?? []) {
            const conversions = Number(m.actions?.find((a) => a.action_type === "purchase")?.value ?? 0);
            const revenue = m.action_values?.find((a) => a.action_type === "purchase")?.value ?? "0";
            await db
              .insert(adSetMetricsTable)
              .values({
                userId,
                adSetId: adSetRow.id,
                date: m.date_start,
                spend: m.spend,
                impressions: Number(m.impressions ?? 0),
                clicks: Number(m.clicks ?? 0),
                conversions,
                revenue,
              })
              .onConflictDoUpdate({
                target: [adSetMetricsTable.adSetId, adSetMetricsTable.date],
                set: {
                  spend: m.spend,
                  impressions: Number(m.impressions ?? 0),
                  clicks: Number(m.clicks ?? 0),
                  conversions,
                  revenue,
                },
              });
          }

          const adsData = await metaFetch<{
            data: Array<{
              id: string;
              name: string;
              status: string;
              creative?: { name?: string; title?: string; body?: string };
            }>;
          }>(credentials, `/${adSet.id}/ads?fields=id,name,status,creative{name,title,body}&limit=100`);
          for (const ad of adsData.data ?? []) {
            const [creativeRow] = await db
              .insert(adCreativesTable)
              .values({
                userId,
                adSetId: adSetRow.id,
                campaignId: row.id,
                channel: "meta",
                externalId: ad.id,
                name: ad.name || ad.creative?.name || ad.creative?.title || `Meta ad ${ad.id}`,
                format: "ad",
                status: ad.status?.toLowerCase() ?? "active",
              })
              .onConflictDoUpdate({
                target: [adCreativesTable.userId, adCreativesTable.channel, adCreativesTable.externalId],
                set: {
                  name: ad.name || ad.creative?.name || ad.creative?.title || `Meta ad ${ad.id}`,
                  status: ad.status?.toLowerCase() ?? "active",
                  adSetId: adSetRow.id,
                  campaignId: row.id,
                },
              })
              .returning({ id: adCreativesTable.id });
            if (!creativeRow) continue;

            const creativeInsights = await metaFetch<{
              data: Array<{
                date_start: string;
                spend: string;
                impressions: string;
                clicks: string;
                actions?: Array<{ action_type: string; value: string }>;
                action_values?: Array<{ action_type: string; value: string }>;
              }>;
            }>(
              credentials,
              `/${ad.id}/insights?fields=spend,impressions,clicks,actions,action_values&time_increment=1&date_preset=last_30d`,
            );
            for (const m of creativeInsights.data ?? []) {
              const conversions = Number(m.actions?.find((a) => a.action_type === "purchase")?.value ?? 0);
              const revenue = m.action_values?.find((a) => a.action_type === "purchase")?.value ?? "0";
              await db
                .insert(creativeMetricsTable)
                .values({
                  userId,
                  creativeId: creativeRow.id,
                  date: m.date_start,
                  spend: m.spend,
                  impressions: Number(m.impressions ?? 0),
                  clicks: Number(m.clicks ?? 0),
                  conversions,
                  revenue,
                })
                .onConflictDoUpdate({
                  target: [creativeMetricsTable.creativeId, creativeMetricsTable.date],
                  set: {
                    spend: m.spend,
                    impressions: Number(m.impressions ?? 0),
                    clicks: Number(m.clicks ?? 0),
                    conversions,
                    revenue,
                  },
                });
            }
          }
        }

        const insightsData = await metaFetch<{
          data: Array<{
            date_start: string;
            spend: string;
            impressions: string;
            clicks: string;
            actions?: Array<{ action_type: string; value: string }>;
            action_values?: Array<{ action_type: string; value: string }>;
          }>;
        }>(
          credentials,
          `/${c.id}/insights?fields=spend,impressions,clicks,actions,action_values&time_increment=1&date_preset=last_30d`,
        );
        for (const m of insightsData.data) {
          const purchases =
            m.actions?.find((a) => a.action_type === "purchase")?.value ?? "0";
          const purchaseValue =
            m.action_values?.find((a) => a.action_type === "purchase")?.value ??
            "0";
          await db
            .insert(adMetricsTable)
            .values({
              userId,
              campaignId: row.id,
              date: m.date_start,
              spend: m.spend,
              impressions: Number(m.impressions),
              clicks: Number(m.clicks),
              conversions: Number(purchases),
              revenue: purchaseValue,
            })
            .onConflictDoUpdate({
              target: [adMetricsTable.campaignId, adMetricsTable.date],
              set: {
                spend: m.spend,
                impressions: Number(m.impressions),
                clicks: Number(m.clicks),
                conversions: Number(purchases),
                revenue: purchaseValue,
              },
            });
          result.metricsAdded += 1;
        }
      }
    } catch (err) {
      logger.error({ err }, "Meta Ads sync error");
      throw err;
    }
    return result;
  },
};
