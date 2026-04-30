import { and, between, eq, inArray, sql } from "drizzle-orm";
import { db, ordersTable, adMetricsTable } from "@workspace/db";
import type { DateWindow } from "../lib/dateRange";

/**
 * RevenueService — single source of truth for revenue, ad spend, and profit.
 *
 * Definitions (NEVER deviate, used by every module):
 *   revenue   = SUM(orders.total_amount WHERE status IN ('paid','fulfilled'))
 *   ad_spend  = SUM(ad_metrics.spend)
 *   profit    = revenue - ad_spend
 */
export const REVENUE_STATUSES = ["paid", "fulfilled"] as const;

export class RevenueService {
  static async getTotalRevenue(
    userId: string,
    win: DateWindow,
  ): Promise<number> {
    const [row] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      );
    return Number(row?.total ?? 0);
  }

  static async getTotalAdSpend(
    userId: string,
    win: DateWindow,
  ): Promise<number> {
    const [row] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${adMetricsTable.spend}), 0)`,
      })
      .from(adMetricsTable)
      .where(
        and(
          eq(adMetricsTable.userId, userId),
          sql`${adMetricsTable.date} >= ${win.from.toISOString().slice(0, 10)}`,
          sql`${adMetricsTable.date} <= ${win.to.toISOString().slice(0, 10)}`,
        ),
      );
    return Number(row?.total ?? 0);
  }

  static async getProfit(userId: string, win: DateWindow): Promise<number> {
    const [revenue, adSpend] = await Promise.all([
      this.getTotalRevenue(userId, win),
      this.getTotalAdSpend(userId, win),
    ]);
    return revenue - adSpend;
  }

  static async getOrdersCount(
    userId: string,
    win: DateWindow,
  ): Promise<number> {
    const [row] = await db
      .select({
        c: sql<string>`COUNT(*)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      );
    return Number(row?.c ?? 0);
  }

  static async getRevenueByDay(
    userId: string,
    win: DateWindow,
  ): Promise<Array<{ date: string; revenue: number; adSpend: number }>> {
    const revRows = await db
      .select({
        d: sql<string>`to_char(${ordersTable.orderedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        v: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      )
      .groupBy(
        sql`to_char(${ordersTable.orderedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      );

    const adRows = await db
      .select({
        d: sql<string>`to_char(${adMetricsTable.date}, 'YYYY-MM-DD')`,
        v: sql<string>`COALESCE(SUM(${adMetricsTable.spend}), 0)`,
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

    const revMap = new Map(revRows.map((r) => [r.d, Number(r.v)]));
    const adMap = new Map(adRows.map((r) => [r.d, Number(r.v)]));

    const out: Array<{ date: string; revenue: number; adSpend: number }> = [];
    for (let i = 0; i <= win.days; i++) {
      const d = new Date(win.from);
      d.setUTCDate(win.from.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        date: key,
        revenue: revMap.get(key) ?? 0,
        adSpend: adMap.get(key) ?? 0,
      });
    }
    return out;
  }

  static async getRevenueByPlatform(
    userId: string,
    win: DateWindow,
  ): Promise<Array<{ platform: string; revenue: number }>> {
    const rows = await db
      .select({
        platform: ordersTable.platform,
        v: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      )
      .groupBy(ordersTable.platform);
    return rows.map((r) => ({ platform: r.platform, revenue: Number(r.v) }));
  }
}
