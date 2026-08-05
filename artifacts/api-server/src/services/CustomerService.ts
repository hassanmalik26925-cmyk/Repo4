import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, customersTable, ordersTable, orderItemsTable } from "@workspace/db";
import type { DateWindow } from "../lib/dateRange";
import { REVENUE_STATUSES } from "./RevenueService";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
}

export interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    platform: string;
    totalSpent: number;
    ordersCount: number;
    createdAt: string;
  };
  summary: {
    loyaltyTier: string;
    loyaltyScore: number;
    averageOrderValue: number;
    repeatPurchaseRate: number;
    lastOrderAt: string | null;
    daysSinceLastOrder: number | null;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    platform: string;
    status: string;
    totalAmount: number;
    profit: number;
    orderedAt: string;
    itemCount: number;
    productSummary: string;
  }>;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
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

  static async detail(userId: string, customerId: string): Promise<CustomerDetail | null> {
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(and(eq(customersTable.userId, userId), eq(customersTable.id, customerId)));
    if (!customer) return null;

    const [orders, topProducts] = await Promise.all([
      db
        .select({
          id: ordersTable.id,
          orderNumber: ordersTable.orderNumber,
          platform: ordersTable.platform,
          status: ordersTable.status,
          totalAmount: ordersTable.totalAmount,
          orderedAt: ordersTable.orderedAt,
          itemsCost: sql<string>`COALESCE(SUM(${orderItemsTable.unitCost} * ${orderItemsTable.quantity}), 0)`,
          itemCount: sql<string>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`,
          productSummary: sql<string>`COALESCE(string_agg(${orderItemsTable.name}, ', ' ORDER BY ${orderItemsTable.name}), '')`,
        })
        .from(ordersTable)
        .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(and(eq(ordersTable.userId, userId), eq(ordersTable.customerId, customerId)))
        .groupBy(
          ordersTable.id,
          ordersTable.orderNumber,
          ordersTable.platform,
          ordersTable.status,
          ordersTable.totalAmount,
          ordersTable.orderedAt,
        )
        .orderBy(desc(ordersTable.orderedAt))
        .limit(200),
      db
        .select({
          name: orderItemsTable.name,
          units: sql<string>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`,
          revenue: sql<string>`COALESCE(SUM(${orderItemsTable.quantity} * ${orderItemsTable.unitPrice}), 0)`,
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
        .where(and(eq(ordersTable.userId, userId), eq(ordersTable.customerId, customerId)))
        .groupBy(orderItemsTable.name)
        .orderBy(desc(sql`SUM(${orderItemsTable.quantity})`))
        .limit(5),
    ]);

    const lastOrder = orders[0]?.orderedAt ?? null;
    const daysSinceLastOrder = lastOrder
      ? Math.max(0, Math.floor((Date.now() - lastOrder.getTime()) / 86_400_000))
      : null;
    const averageOrderValue = customer.ordersCount > 0
      ? Number(customer.totalSpent) / customer.ordersCount
      : 0;
    const repeatPurchaseRate = customer.ordersCount > 0
      ? Math.min(100, Math.max(0, ((customer.ordersCount - 1) / customer.ordersCount) * 100))
      : 0;
    const loyaltyTier =
      customer.ordersCount >= 5 || Number(customer.totalSpent) >= 1000
        ? "VIP"
        : customer.ordersCount >= 3 || Number(customer.totalSpent) >= 500
          ? "Loyal"
          : customer.ordersCount > 1
            ? "Returning"
            : "New";
    const recencyScore = daysSinceLastOrder === null ? 0 : Math.max(0, 40 - Math.min(daysSinceLastOrder, 40));
    const frequencyScore = Math.min(35, customer.ordersCount * 7);
    const valueScore = Math.min(25, Math.round((Number(customer.totalSpent) / 1000) * 25));

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        platform: customer.platform,
        totalSpent: Number(customer.totalSpent),
        ordersCount: customer.ordersCount,
        createdAt: customer.createdAt.toISOString(),
      },
      summary: {
        loyaltyTier,
        loyaltyScore: Math.min(100, recencyScore + frequencyScore + valueScore),
        averageOrderValue,
        repeatPurchaseRate,
        lastOrderAt: lastOrder?.toISOString() ?? null,
        daysSinceLastOrder,
      },
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        platform: order.platform,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        profit: Number(order.totalAmount) - Number(order.itemsCost),
        orderedAt: order.orderedAt.toISOString(),
        itemCount: Number(order.itemCount),
        productSummary: order.productSummary,
      })),
      topProducts: topProducts.map((product) => ({
        name: product.name,
        units: Number(product.units),
        revenue: Number(product.revenue),
      })),
    };
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

  static async repeatCustomers(userId: string, win: DateWindow) {
    const rows = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        email: customersTable.email,
        ordersCount: sql<string>`COUNT(${ordersTable.id})`,
        totalSpent: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
      })
      .from(customersTable)
      .leftJoin(
        ordersTable,
        and(
          eq(ordersTable.customerId, customersTable.id),
          gte(ordersTable.orderedAt, win.from),
          lte(ordersTable.orderedAt, win.to),
        ),
      )
      .where(eq(customersTable.userId, userId))
      .groupBy(customersTable.id, customersTable.name, customersTable.email)
      .having(sql`COUNT(${ordersTable.id}) > 1`)
      .orderBy(desc(sql`COUNT(${ordersTable.id})`), desc(sql`SUM(${ordersTable.totalAmount})`))
      .limit(5);

    return rows.map((row) => {
      const ordersCount = Number(row.ordersCount);
      const totalSpent = Number(row.totalSpent);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        ordersCount,
        totalSpent,
        averageOrderValue: ordersCount > 0 ? totalSpent / ordersCount : 0,
      };
    });
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
