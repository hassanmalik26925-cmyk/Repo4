import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, ordersTable, customersTable, productsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

interface ShopifyCreds extends Record<string, unknown> {
  shopDomain: string;
  accessToken: string;
}

function isShopifyCreds(c: Record<string, unknown>): c is ShopifyCreds {
  return typeof c.shopDomain === "string" && typeof c.accessToken === "string";
}

async function shopifyFetch<T>(
  creds: ShopifyCreds,
  path: string,
): Promise<T> {
  const url = `https://${creds.shopDomain}/admin/api/2024-04${path}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": creds.accessToken,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export const shopifyAdapter: IntegrationAdapter = {
  platform: "shopify",
  displayName: "Shopify",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isShopifyCreds(credentials)) {
      throw new Error("shopDomain and accessToken are required");
    }
    await shopifyFetch<{ shop: unknown }>(credentials, "/shop.json");
  },

  async sync(userId, credentials) {
    if (!isShopifyCreds(credentials)) {
      throw new Error("Invalid Shopify credentials");
    }
    const result: SyncResult = { ...ZERO_SYNC };
    try {
      const productData = await shopifyFetch<{
        products: Array<{
          id: number;
          title: string;
          product_type: string;
          variants: Array<{
            sku: string;
            price: string;
            inventory_quantity: number;
          }>;
        }>;
      }>(credentials, "/products.json?limit=50");
      for (const p of productData.products) {
        const v = p.variants[0];
        await db
          .insert(productsTable)
          .values({
            userId,
            platform: "shopify",
            externalId: String(p.id),
            name: p.title,
            sku: v?.sku ?? null,
            category: p.product_type || "Uncategorized",
            price: v?.price ?? "0",
            cogs: "0",
            stock: v?.inventory_quantity ?? 0,
          })
          .onConflictDoUpdate({
            target: [
              productsTable.userId,
              productsTable.platform,
              productsTable.externalId,
            ],
            set: {
              name: p.title,
              price: v?.price ?? "0",
              stock: v?.inventory_quantity ?? 0,
            },
          });
        result.productsAdded += 1;
      }

      const orderData = await shopifyFetch<{
        orders: Array<{
          id: number;
          name: string;
          total_price: string;
          subtotal_price: string;
          total_tax: string;
          total_shipping_price_set: { shop_money: { amount: string } };
          financial_status: string;
          fulfillment_status: string | null;
          created_at: string;
          customer: {
            id: number;
            email: string;
            first_name: string;
            last_name: string;
            phone: string | null;
          } | null;
        }>;
      }>(credentials, "/orders.json?status=any&limit=50");

      for (const o of orderData.orders) {
        let customerId: string | null = null;
        if (o.customer) {
          const [c] = await db
            .insert(customersTable)
            .values({
              userId,
              platform: "shopify",
              externalId: String(o.customer.id),
              email: o.customer.email,
              name: `${o.customer.first_name ?? ""} ${o.customer.last_name ?? ""}`.trim(),
              phone: o.customer.phone,
            })
            .onConflictDoUpdate({
              target: [
                customersTable.userId,
                customersTable.platform,
                customersTable.externalId,
              ],
              set: { email: o.customer.email },
            })
            .returning({ id: customersTable.id });
          customerId = c?.id ?? null;
          result.customersAdded += 1;
        }

        const status =
          o.fulfillment_status === "fulfilled"
            ? "fulfilled"
            : o.financial_status === "paid"
              ? "paid"
              : o.financial_status === "refunded"
                ? "refunded"
                : "pending";

        await db
          .insert(ordersTable)
          .values({
            userId,
            platform: "shopify",
            externalId: String(o.id),
            orderNumber: o.name,
            customerId,
            subtotal: o.subtotal_price ?? "0",
            shipping: o.total_shipping_price_set?.shop_money.amount ?? "0",
            tax: o.total_tax ?? "0",
            totalAmount: o.total_price,
            status,
            orderedAt: new Date(o.created_at),
          })
          .onConflictDoUpdate({
            target: [
              ordersTable.userId,
              ordersTable.platform,
              ordersTable.externalId,
            ],
            set: { status, totalAmount: o.total_price },
          });
        result.ordersAdded += 1;
      }
    } catch (err) {
      logger.error({ err }, "Shopify sync error");
      throw err;
    }
    return result;
  },
};
