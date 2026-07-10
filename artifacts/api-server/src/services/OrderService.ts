import { and, between, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  customersTable,
  productsTable,
  usersTable,
  type Order,
  type OrderItem,
} from "@workspace/db";
import type { DateWindow } from "../lib/dateRange";
import { REVENUE_STATUSES } from "./RevenueService";
import { sendMail } from "../lib/email";
import { logger } from "../lib/logger";

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

  /**
   * Sends a real receipt email for any order that has reached a
   * revenue-recognized status (paid/fulfilled) and hasn't been emailed yet.
   * The "from"/store identity comes from the account's own data (name +
   * email) rather than a separately configured address, and the recipient
   * comes from the order's linked customer record — no mock addresses.
   * Best-effort: never throws, so it never blocks the order flow.
   */
  static async sendPendingReceipts(userId: string): Promise<number> {
    const [user] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) return 0;

    const pending = await db
      .select({
        id: ordersTable.id,
        orderNumber: ordersTable.orderNumber,
        status: ordersTable.status,
        subtotal: ordersTable.subtotal,
        shipping: ordersTable.shipping,
        tax: ordersTable.tax,
        totalAmount: ordersTable.totalAmount,
        orderedAt: ordersTable.orderedAt,
        customerName: customersTable.name,
        customerEmail: customersTable.email,
      })
      .from(ordersTable)
      .innerJoin(customersTable, eq(customersTable.id, ordersTable.customerId))
      .where(
        and(
          eq(ordersTable.userId, userId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          isNull(ordersTable.receiptSentAt),
        ),
      )
      .limit(50);

    let sentCount = 0;
    for (const o of pending) {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, o.id));

      const html = buildReceiptHtml({
        storeName: user.name,
        orderNumber: o.orderNumber,
        orderedAt: o.orderedAt,
        customerName: o.customerName,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        tax: Number(o.tax),
        total: Number(o.totalAmount),
      });

      const ok = await sendMail({
        to: o.customerEmail,
        fromName: user.name,
        fromEmail: user.email,
        subject: `Your receipt from ${user.name} — Order ${o.orderNumber}`,
        html,
      });

      if (ok) {
        await db
          .update(ordersTable)
          .set({ receiptSentAt: new Date() })
          .where(eq(ordersTable.id, o.id));
        sentCount += 1;
      } else {
        logger.warn({ orderId: o.id }, "Receipt email not sent (SMTP not configured or failed)");
      }
    }
    return sentCount;
  }
}

function buildReceiptHtml(input: {
  storeName: string;
  orderNumber: string;
  orderedAt: Date;
  customerName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const rows = input.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;color:#111">${i.name}</td>
        <td style="padding:8px 0;text-align:center;color:#555">${i.quantity}</td>
        <td style="padding:8px 0;text-align:right;color:#111">${money(i.unitPrice * i.quantity)}</td>
      </tr>`,
    )
    .join("");

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">${input.storeName}</h2>
    <p style="color:#555;margin:0 0 24px">Thank you for your order!</p>
    <p style="margin:0 0 4px"><strong>Order ${input.orderNumber}</strong></p>
    <p style="color:#555;margin:0 0 24px">${input.orderedAt.toLocaleDateString()} · ${input.customerName}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="border-bottom:1px solid #e5e5e5">
          <th style="text-align:left;padding-bottom:8px;color:#888;font-size:12px">ITEM</th>
          <th style="text-align:center;padding-bottom:8px;color:#888;font-size:12px">QTY</th>
          <th style="text-align:right;padding-bottom:8px;color:#888;font-size:12px">PRICE</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="color:#555;padding:2px 0">Subtotal</td><td style="text-align:right;padding:2px 0">${money(input.subtotal)}</td></tr>
      <tr><td style="color:#555;padding:2px 0">Shipping</td><td style="text-align:right;padding:2px 0">${money(input.shipping)}</td></tr>
      <tr><td style="color:#555;padding:2px 0">Tax</td><td style="text-align:right;padding:2px 0">${money(input.tax)}</td></tr>
      <tr style="border-top:1px solid #e5e5e5"><td style="padding-top:8px;font-weight:600">Total</td><td style="text-align:right;padding-top:8px;font-weight:600">${money(input.total)}</td></tr>
    </table>
    <p style="color:#999;font-size:12px;margin-top:32px">Sent by ${input.storeName} via Pulse Commerce.</p>
  </div>`;
}
