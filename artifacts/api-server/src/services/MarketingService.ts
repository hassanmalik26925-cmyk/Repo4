import { and, between, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  adCampaignsTable,
  adMetricsTable,
  ordersTable,
} from "@workspace/db";
import type { DateWindow } from "../lib/dateRange";
import { RevenueService, REVENUE_STATUSES } from "./RevenueService";

export interface CampaignRow {
  id: string;
  name: string;
  channel: string;
  spend: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  cpa: number;
  roas: number;
  ctr: number;
}

export interface ChannelRow {
  channel: string;
  spend: number;
  revenue: number;
}

export class MarketingService {
  /** Marketing summary - uses RevenueService for ad_spend (single source of truth). */
  static async summary(userId: string, win: DateWindow) {
    const [adSpend, attributedRow, convRow] = await Promise.all([
      RevenueService.getTotalAdSpend(userId, win),
      db
        .select({
          revenue: sql<string>`COALESCE(SUM(${adMetricsTable.revenue}), 0)`,
          clicks: sql<string>`COALESCE(SUM(${adMetricsTable.clicks}), 0)`,
          impressions: sql<string>`COALESCE(SUM(${adMetricsTable.impressions}), 0)`,
        })
        .from(adMetricsTable)
        .where(
          and(
            eq(adMetricsTable.userId, userId),
            sql`${adMetricsTable.date} >= ${win.from
              .toISOString()
              .slice(0, 10)}`,
            sql`${adMetricsTable.date} <= ${win.to
              .toISOString()
              .slice(0, 10)}`,
          ),
        ),
      db
        .select({
          c: sql<string>`COALESCE(SUM(${adMetricsTable.conversions}), 0)`,
        })
        .from(adMetricsTable)
        .where(
          and(
            eq(adMetricsTable.userId, userId),
            sql`${adMetricsTable.date} >= ${win.from
              .toISOString()
              .slice(0, 10)}`,
            sql`${adMetricsTable.date} <= ${win.to
              .toISOString()
              .slice(0, 10)}`,
          ),
        ),
    ]);
    const adRevenue = Number(attributedRow[0]?.revenue ?? 0);
    const clicks = Number(attributedRow[0]?.clicks ?? 0);
    const impressions = Number(attributedRow[0]?.impressions ?? 0);
    const conversions = Number(convRow[0]?.c ?? 0);
    return {
      adSpend,
      adRevenue,
      roas: adSpend > 0 ? adRevenue / adSpend : 0,
      cpa: conversions > 0 ? adSpend / conversions : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions,
      clicks,
      impressions,
    };
  }

  static async campaigns(
    userId: string,
    win: DateWindow,
  ): Promise<CampaignRow[]> {
    const fromKey = win.from.toISOString().slice(0, 10);
    const toKey = win.to.toISOString().slice(0, 10);

    const rows = await db
      .select({
        id: adCampaignsTable.id,
        name: adCampaignsTable.name,
        channel: adCampaignsTable.channel,
        spend: sql<string>`COALESCE(SUM(${adMetricsTable.spend}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${adMetricsTable.revenue}), 0)`,
        conversions: sql<string>`COALESCE(SUM(${adMetricsTable.conversions}), 0)`,
        clicks: sql<string>`COALESCE(SUM(${adMetricsTable.clicks}), 0)`,
        impressions: sql<string>`COALESCE(SUM(${adMetricsTable.impressions}), 0)`,
      })
      .from(adCampaignsTable)
      .leftJoin(
        adMetricsTable,
        and(
          eq(adMetricsTable.campaignId, adCampaignsTable.id),
          sql`${adMetricsTable.date} >= ${fromKey}`,
          sql`${adMetricsTable.date} <= ${toKey}`,
        ),
      )
      .where(eq(adCampaignsTable.userId, userId))
      .groupBy(adCampaignsTable.id, adCampaignsTable.name, adCampaignsTable.channel)
      .orderBy(desc(sql`COALESCE(SUM(${adMetricsTable.spend}), 0)`));

    return rows.map((r) => {
      const spend = Number(r.spend);
      const revenue = Number(r.revenue);
      const conversions = Number(r.conversions);
      const clicks = Number(r.clicks);
      const impressions = Number(r.impressions);
      return {
        id: r.id,
        name: r.name,
        channel: r.channel,
        spend,
        revenue,
        conversions,
        clicks,
        impressions,
        cpa: conversions > 0 ? spend / conversions : 0,
        roas: spend > 0 ? revenue / spend : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      };
    });
  }

  static async byChannel(
    userId: string,
    win: DateWindow,
  ): Promise<ChannelRow[]> {
    const fromKey = win.from.toISOString().slice(0, 10);
    const toKey = win.to.toISOString().slice(0, 10);

    const rows = await db
      .select({
        channel: adCampaignsTable.channel,
        spend: sql<string>`COALESCE(SUM(${adMetricsTable.spend}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${adMetricsTable.revenue}), 0)`,
      })
      .from(adCampaignsTable)
      .leftJoin(
        adMetricsTable,
        and(
          eq(adMetricsTable.campaignId, adCampaignsTable.id),
          sql`${adMetricsTable.date} >= ${fromKey}`,
          sql`${adMetricsTable.date} <= ${toKey}`,
        ),
      )
      .where(eq(adCampaignsTable.userId, userId))
      .groupBy(adCampaignsTable.channel);

    return rows.map((r) => ({
      channel: r.channel,
      spend: Number(r.spend),
      revenue: Number(r.revenue),
    }));
  }
}

export { REVENUE_STATUSES };
