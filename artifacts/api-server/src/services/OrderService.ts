import { and, between, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  customersTable,
  productsTable,
  type Order,
  type OrderItem,
} from "@workspace/db";
import type { DateWindow } from "../lib/dateRange";
import { REVENUE_STATUSES } from "./RevenueService";

export interface OrderListFilters {
  status?: string;
  platform?: string;
  search?: string;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  platform: string;
  status: string;
  totalAmount: number;
  profit: number;
  orderedAt: string;
  productSummary: string;
  itemCount: number;
}

export interface OrderDetail {
  order: Omit<Order, "totalAmount" | "subtotal" | "shipping" | "tax"> & {
    totalAmount: number;
    subtotal: number;
    shipping: number;
    tax: number;
    profit: number;
  };
  items: Array<
    Omit<OrderItem, "unitPrice" | "unitCost"> & {
      unitPrice: number;
      unitCost: number;
      lineTotal: number;
    }
  >;
  customer: {
    id: string | null;
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

function rowProfit(o: {
  totalAmount: string | number;
  itemsCost: string | number;
}): number {
  return Number(o.totalAmount) - Number(o.itemsCost);
}

export class OrderService {
  static async list(
    userId: string,
    win: DateWindow,
    filters: OrderListFilters = {},
  ): Promise<OrderRow[]> {
    const cond = [
      eq(ordersTable.userId, userId),
      between(ordersTable.orderedAt, win.from, win.to),
    ];
    if (filters.status && filters.status !== "all") {
      cond.push(eq(ordersTable.status, filters.status));
    }
    if (filters.platform && filters.platform !== "all") {
      cond.push(eq(ordersTable.platform, filters.platform));
    }
    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      cond.push(
        or(
          sql`LOWER(${ordersTable.orderNumber}) LIKE ${q}`,
          sql`EXISTS (SELECT 1 FROM ${orderItemsTable} oi WHERE oi.order_id = ${ordersTable.id} AND LOWER(oi.name) LIKE ${q})`,
        )!,
      );
    }

    const rows = await db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        platform: ordersTable.platform,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        orderedAt: ordersTable.orderedAt,
        itemsCost: sql<string>`COALESCE((
          SELECT SUM(oi.unit_cost * oi.quantity)
          FROM ${orderItemsTable} oi
          WHERE oi.order_id = ${ordersTable.id}
        ), 0)`,
        productSummary: sql<string>`COALESCE((
          SELECT oi.name FROM ${orderItemsTable} oi
          WHERE oi.order_id = ${ordersTable.id}
          ORDER BY oi.quantity DESC LIMIT 1
        ), '')`,
        itemCount: sql<string>`COALESCE((
          SELECT SUM(oi.quantity) FROM ${orderItemsTable} oi
          WHERE oi.order_id = ${ordersTable.id}
        ), 0)`,
      })
      .from(ordersTable)
      .where(and(...cond))
      .orderBy(desc(ordersTable.orderedAt))
      .limit(200);

    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      platform: r.platform,
      status: r.status,
      totalAmount: Number(r.totalAmount),
      profit: rowProfit(r),
      orderedAt: r.orderedAt.toISOString(),
      productSummary: r.productSummary,
      itemCount: Number(r.itemCount),
    }));
  }

  static async summary(
    userId: string,
    win: DateWindow,
  ): Promise<{ revenue: number; profit: number; count: number }> {
    const [row] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
        cost: sql<string>`COALESCE(SUM(COALESCE((SELECT SUM(${orderItemsTable.unitCost} * ${orderItemsTable.quantity}) FROM ${orderItemsTable} WHERE ${orderItemsTable.orderId} = ${ordersTable.id}),0)), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      );
    const revenue = Number(row?.revenue ?? 0);
    const cost = Number(row?.cost ?? 0);
    return { revenue, profit: revenue - cost, count: Number(row?.count ?? 0) };
  }

  static async getDetail(
    userId: string,
    orderId: string,
  ): Promise<OrderDetail | null> {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)),
      );
    if (!order) return null;

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));

    let customer = null;
    if (order.customerId) {
      const [c] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId));
      if (c) {
        customer = {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
        };
      }
    }

    const totalCost = items.reduce(
      (s, i) => s + Number(i.unitCost) * i.quantity,
      0,
    );
    return {
      order: {
        ...order,
        totalAmount: Number(order.totalAmount),
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        tax: Number(order.tax),
        profit: Number(order.totalAmount) - totalCost,
      },
      items: items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        unitCost: Number(i.unitCost),
        lineTotal: Number(i.unitPrice) * i.quantity,
      })),
      customer,
    };
  }

  static async markFulfilled(
    userId: string,
    orderId: string,
  ): Promise<Order | null> {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(ordersTable)
        .where(
          and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)),
        );
      if (!order) return null;
      if (order.status === "fulfilled") return order;

      const [updated] = await tx
        .update(ordersTable)
        .set({ status: "fulfilled" })
        .where(eq(ordersTable.id, orderId))
        .returning();

      const items = await tx
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));
      for (const it of items) {
        if (it.productId) {
          await tx
            .update(productsTable)
            .set({
              stock: sql`GREATEST(${productsTable.stock} - ${it.quantity}, 0)`,
            })
            .where(eq(productsTable.id, it.productId));
        }
      }
      return updated;
    });
  }
}
