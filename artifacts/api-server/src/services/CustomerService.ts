import { and, desc, eq, sql } from "drizzle-orm";
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
