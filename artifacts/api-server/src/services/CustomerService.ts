import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, customersTable, ordersTable } from "@workspace/db";
import type { DateWindow } from "../lib/dateRange";
import { REVENUE_STATUSES } from "./RevenueService";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
}

export class CustomerService {
  static async list(userId: string): Promise<CustomerRow[]> {
    const rows = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.userId, userId))
      .orderBy(desc(customersTable.totalSpent))
      .limit(200);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalSpent: Number(c.totalSpent),
      ordersCount: c.ordersCount,
    }));
  }

  static async newCustomersCount(
    userId: string,
    win: DateWindow,
  ): Promise<number> {
    const [row] = await db
      .select({ c: sql<string>`COUNT(*)` })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.userId, userId),
          sql`${customersTable.createdAt} >= ${win.from.toISOString()}`,
          sql`${customersTable.createdAt} <= ${win.to.toISOString()}`,
        ),
      );
    return Number(row?.c ?? 0);
  }

  static async insightsSummary(userId: string, win: DateWindow) {
    const currentFrom = win.from.toISOString();
    const currentTo = win.to.toISOString();
    const previousFrom = win.prevFrom.toISOString();
    const previousTo = win.prevTo.toISOString();

    const [totals, currentNew, previousNew, topCustomer] = await Promise.all([
      db
        .select({
          total: sql<string>`COUNT(*)`,
          repeat: sql<string>`COUNT(*) FILTER (WHERE ${customersTable.ordersCount} > 1)`,
          lifetimeValue: sql<string>`COALESCE(AVG(${customersTable.totalSpent}), 0)`,
        })
        .from(customersTable)
        .where(eq(customersTable.userId, userId)),
      db
        .select({
          count: sql<string>`COUNT(*)`,
          lifetimeValue: sql<string>`COALESCE(AVG(${customersTable.totalSpent}), 0)`,
        })
        .from(customersTable)
        .where(
          and(
            eq(customersTable.userId, userId),
            gte(customersTable.createdAt, new Date(currentFrom)),
            lte(customersTable.createdAt, new Date(currentTo)),
          ),
        ),
      db
        .select({
          count: sql<string>`COUNT(*)`,
          lifetimeValue: sql<string>`COALESCE(AVG(${customersTable.totalSpent}), 0)`,
        })
        .from(customersTable)
        .where(
          and(
            eq(customersTable.userId, userId),
            gte(customersTable.createdAt, new Date(previousFrom)),
            lte(customersTable.createdAt, new Date(previousTo)),
          ),
        ),
      db
        .select({
          name: customersTable.name,
          value: customersTable.totalSpent,
        })
        .from(customersTable)
        .where(eq(customersTable.userId, userId))
        .orderBy(desc(customersTable.totalSpent))
        .limit(1),
    ]);

    const totalCustomers = Number(totals[0]?.total ?? 0);
    const repeatRate = totalCustomers > 0
      ? (Number(totals[0]?.repeat ?? 0) / totalCustomers) * 100
      : 0;
    const currentNewCount = Number(currentNew[0]?.count ?? 0);
    const previousNewCount = Number(previousNew[0]?.count ?? 0);
    const currentLtv = Number(currentNew[0]?.lifetimeValue ?? totals[0]?.lifetimeValue ?? 0);
    const previousLtv = Number(previousNew[0]?.lifetimeValue ?? 0);

    return {
      totalCustomers,
      newCustomers: {
        value: currentNewCount,
        deltaPct: previousNewCount === 0
          ? (currentNewCount === 0 ? 0 : 100)
          : ((currentNewCount - previousNewCount) / previousNewCount) * 100,
      },
      repeatRate: { value: repeatRate, deltaPct: 0 },
      averageLifetimeValue: {
        value: Number(totals[0]?.lifetimeValue ?? 0),
        deltaPct: previousLtv === 0
          ? (currentLtv === 0 ? 0 : 100)
          : ((currentLtv - previousLtv) / previousLtv) * 100,
      },
      topCustomer: topCustomer[0]
        ? { name: topCustomer[0].name, value: Number(topCustomer[0].value) }
        : null,
    };
  }

  /**
   * Recompute denormalized totals (totalSpent, ordersCount) for a customer.
   * Called atomically after order create/update.
   */
  static async recomputeTotals(customerId: string, tx = db): Promise<void> {
    const [agg] = await tx
      .select({
        spent: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.customerId, customerId),
          sql`${ordersTable.status} IN ('paid','fulfilled')`,
        ),
      );
    await tx
      .update(customersTable)
      .set({
        totalSpent: agg?.spent ?? "0",
        ordersCount: Number(agg?.count ?? 0),
      })
      .where(eq(customersTable.id, customerId));
  }
}
