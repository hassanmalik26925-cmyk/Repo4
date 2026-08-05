import { and, between, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  adCampaignsTable,
  adMetricsTable,
  adSetsTable,
  adSetMetricsTable,
  adCreativesTable,
  creativeMetricsTable,
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

export interface PerformanceHighlight {
  id: string;
  name: string;
  channel: string;
  parentName?: string;
  spend: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  cpa: number;
  roas: number;
  ctr: number;
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

  static async trend(
    userId: string,
    win: DateWindow,
  ): Promise<Array<{ date: string; spend: number; revenue: number }>> {
    const rows = await db
      .select({
        date: sql<string>`to_char(${adMetricsTable.date}, 'YYYY-MM-DD')`,
        spend: sql<string>`COALESCE(SUM(${adMetricsTable.spend}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${adMetricsTable.revenue}), 0)`,
      })
      .from(adMetricsTable)
      .where(
        and(
          eq(adMetricsTable.userId, userId),
          sql`${adMetricsTable.date} >= ${win.from.toISOString().slice(0, 10)}`,
          sql`${adMetricsTable.date} <= ${win.to.toISOString().slice(0, 10)}`,
        ),
      )
      .groupBy(sql`to_char(${adMetricsTable.date}, 'YYYY-MM-DD')`);

    const byDate = new Map(
      rows.map((row) => [
        row.date,
        { spend: Number(row.spend), revenue: Number(row.revenue) },
      ]),
    );

    const trend: Array<{ date: string; spend: number; revenue: number }> = [];
    for (let index = 0; index <= win.days; index += 1) {
      const date = new Date(win.from);
      date.setUTCDate(win.from.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const point = byDate.get(key);
      trend.push({
        date: key,
        spend: point?.spend ?? 0,
        revenue: point?.revenue ?? 0,
      });
    }
    return trend;
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

  static async performanceHighlights(
    userId: string,
    win: DateWindow,
  ): Promise<{ adSets: PerformanceHighlight[]; creatives: PerformanceHighlight[] }> {
    const fromKey = win.from.toISOString().slice(0, 10);
    const toKey = win.to.toISOString().slice(0, 10);

    const [adSetRows, creativeRows] = await Promise.all([
      db
        .select({
          id: adSetsTable.id,
          name: adSetsTable.name,
          channel: adSetsTable.channel,
          parentName: adCampaignsTable.name,
          spend: sql<string>`COALESCE(SUM(${adSetMetricsTable.spend}), 0)`,
          revenue: sql<string>`COALESCE(SUM(${adSetMetricsTable.revenue}), 0)`,
          conversions: sql<string>`COALESCE(SUM(${adSetMetricsTable.conversions}), 0)`,
          clicks: sql<string>`COALESCE(SUM(${adSetMetricsTable.clicks}), 0)`,
          impressions: sql<string>`COALESCE(SUM(${adSetMetricsTable.impressions}), 0)`,
        })
        .from(adSetsTable)
        .innerJoin(adCampaignsTable, eq(adSetsTable.campaignId, adCampaignsTable.id))
        .leftJoin(
          adSetMetricsTable,
          and(
            eq(adSetMetricsTable.adSetId, adSetsTable.id),
            sql`${adSetMetricsTable.date} >= ${fromKey}`,
            sql`${adSetMetricsTable.date} <= ${toKey}`,
          ),
        )
        .where(eq(adSetsTable.userId, userId))
        .groupBy(adSetsTable.id, adSetsTable.name, adSetsTable.channel, adCampaignsTable.name),
      db
        .select({
          id: adCreativesTable.id,
          name: adCreativesTable.name,
          channel: adCreativesTable.channel,
          parentName: adSetsTable.name,
          spend: sql<string>`COALESCE(SUM(${creativeMetricsTable.spend}), 0)`,
          revenue: sql<string>`COALESCE(SUM(${creativeMetricsTable.revenue}), 0)`,
          conversions: sql<string>`COALESCE(SUM(${creativeMetricsTable.conversions}), 0)`,
          clicks: sql<string>`COALESCE(SUM(${creativeMetricsTable.clicks}), 0)`,
          impressions: sql<string>`COALESCE(SUM(${creativeMetricsTable.impressions}), 0)`,
        })
        .from(adCreativesTable)
        .innerJoin(adSetsTable, eq(adCreativesTable.adSetId, adSetsTable.id))
        .leftJoin(
          creativeMetricsTable,
          and(
            eq(creativeMetricsTable.creativeId, adCreativesTable.id),
            sql`${creativeMetricsTable.date} >= ${fromKey}`,
            sql`${creativeMetricsTable.date} <= ${toKey}`,
          ),
        )
        .where(eq(adCreativesTable.userId, userId))
        .groupBy(adCreativesTable.id, adCreativesTable.name, adCreativesTable.channel, adSetsTable.name),
    ]);

    const mapRows = (rows: typeof adSetRows): PerformanceHighlight[] =>
      rows
        .map((row) => {
          const spend = Number(row.spend);
          const revenue = Number(row.revenue);
          const conversions = Number(row.conversions);
          const clicks = Number(row.clicks);
          const impressions = Number(row.impressions);
          return {
            id: row.id,
            name: row.name,
            channel: row.channel,
            parentName: row.parentName,
            spend,
            revenue,
            conversions,
            clicks,
            impressions,
            cpa: conversions > 0 ? spend / conversions : 0,
            roas: spend > 0 ? revenue / spend : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          };
        })
        .filter((row) => row.spend > 0 || row.revenue > 0)
        .sort((a, b) => {
          const aQualified = a.spend >= 50 ? 1 : 0;
          const bQualified = b.spend >= 50 ? 1 : 0;
          return bQualified - aQualified || b.roas - a.roas || b.revenue - a.revenue;
        })
        .slice(0, 5);

    return {
      adSets: mapRows(adSetRows),
      creatives: mapRows(creativeRows),
    };
  }
}

export { REVENUE_STATUSES };
