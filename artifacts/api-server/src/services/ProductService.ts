import { and, between, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  ordersTable,
  orderItemsTable,
  type Product,
} from "@workspace/db";
import { dateWindow, type DateWindow } from "../lib/dateRange";
import { REVENUE_STATUSES } from "./RevenueService";

export interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  price: number;
  cogs: number;
  stock: number;
  status: string;
  lowStock: boolean;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
  roas: number;
}

export class ProductService {
  static async list(
    userId: string,
    win: DateWindow,
  ): Promise<ProductPerformance[]> {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.userId, userId));

    if (products.length === 0) return [];

    const stats = await db
      .select({
        productId: orderItemsTable.productId,
        units: sql<string>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${orderItemsTable.unitPrice} * ${orderItemsTable.quantity}), 0)`,
        cost: sql<string>`COALESCE(SUM(${orderItemsTable.unitCost} * ${orderItemsTable.quantity}), 0)`,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(
        and(
          eq(ordersTable.userId, userId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      )
      .groupBy(orderItemsTable.productId);

    const map = new Map(
      stats.map((s) => [
        s.productId,
        {
          units: Number(s.units),
          revenue: Number(s.revenue),
          cost: Number(s.cost),
        },
      ]),
    );

    return products
      .map<ProductPerformance>((p) => {
        const s = map.get(p.id) ?? { units: 0, revenue: 0, cost: 0 };
        const profit = s.revenue - s.cost;
        const margin = s.revenue > 0 ? (profit / s.revenue) * 100 : 0;
        // Per-product ROAS approximation: profit / cogs ratio used for sort.
        const roas = s.cost > 0 ? s.revenue / s.cost : 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: Number(p.price),
          cogs: Number(p.cogs),
          stock: p.stock,
          status: p.status,
          lowStock: p.stock <= p.lowStockThreshold,
          unitsSold: s.units,
          revenue: s.revenue,
          profit,
          margin,
          roas,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  static async getOne(
    userId: string,
    productId: string,
  ): Promise<ProductPerformance | null> {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.userId, userId)));
    if (!product) return null;

    // 90d matches the widest dashboard range, keeping single-product stats
    // consistent with the list/dashboard views instead of a separate formula.
    const win = dateWindow("90d");
    const [s] = await db
      .select({
        units: sql<string>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${orderItemsTable.unitPrice} * ${orderItemsTable.quantity}), 0)`,
        cost: sql<string>`COALESCE(SUM(${orderItemsTable.unitCost} * ${orderItemsTable.quantity}), 0)`,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(
        and(
          eq(ordersTable.userId, userId),
          eq(orderItemsTable.productId, productId),
          inArray(ordersTable.status, [...REVENUE_STATUSES]),
          between(ordersTable.orderedAt, win.from, win.to),
        ),
      );

    const units = Number(s?.units ?? 0);
    const revenue = Number(s?.revenue ?? 0);
    const cost = Number(s?.cost ?? 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const roas = cost > 0 ? revenue / cost : 0;

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      cogs: Number(product.cogs),
      stock: product.stock,
      status: product.status,
      lowStock: product.stock <= product.lowStockThreshold,
      unitsSold: units,
      revenue,
      profit,
      margin,
      roas,
    };
  }

  static async lowStock(userId: string): Promise<Product[]> {
    return db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.userId, userId),
          sql`${productsTable.stock} <= ${productsTable.lowStockThreshold}`,
        ),
      )
      .orderBy(productsTable.stock);
  }
}
