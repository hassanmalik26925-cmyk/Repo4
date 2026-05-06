/**
 * WooCommerce REST API v3 adapter.
 * Auth: HTTP Basic with consumer key + secret (HTTPS only).
 * Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import {
  db,
  ordersTable,
  customersTable,
  productsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, paginate } from "../lib/rateLimit";

interface WooCreds extends Record<string, unknown> {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

function isWooCreds(c: Record<string, unknown>): c is WooCreds {
  return (
    typeof c.storeUrl === "string" &&
    typeof c.consumerKey === "string" &&
    typeof c.consumerSecret === "string"
  );
}

const limiter = new RateLimiter(5, 1_000); // 5 req/s

async function wooFetch<T>(creds: WooCreds, path: string): Promise<T> {
  await limiter.throttle();
  const base = creds.storeUrl.replace(/\/$/, "");
  const url = `${base}/wp-json/wc/v3${path}`;
  const auth = Buffer.from(
    `${creds.consumerKey}:${creds.consumerSecret}`,
  ).toString("base64");
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`WooCommerce ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export const wooCommerceAdapter: IntegrationAdapter = {
  platform: "woocommerce",
  displayName: "WooCommerce",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isWooCreds(credentials))
      throw new Error("storeUrl, consumerKey, and consumerSecret are required");
    await wooFetch<{ store: unknown }>(credentials, "/system_status");
  },

  async sync(userId, credentials) {
    if (!isWooCreds(credentials)) throw new Error("Invalid WooCommerce credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    // ── Products ──────────────────────────────────────────────────────────────
    const products = await withRetry("woo:products", () =>
      paginate<any>((page) =>
        wooFetch(credentials, `/products?per_page=100&page=${page}&status=publish`)
      )
    );

    for (const p of products) {
      await db
        .insert(productsTable)
        .values({
          userId,
          platform: "woocommerce",
          externalId: String(p.id),
          name: p.name,
          sku: p.sku || null,
          category: p.categories?.[0]?.name ?? "Uncategorized",
          price: p.price || "0",
          cogs: "0",
          stock: p.stock_quantity ?? 0,
        })
        .onConflictDoUpdate({
          target: [productsTable.userId, productsTable.platform, productsTable.externalId],
          set: { name: p.name, price: p.price || "0", stock: p.stock_quantity ?? 0 },
        });
      result.productsAdded += 1;
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 90);
    const after = sinceDate.toISOString();

    const orders = await withRetry("woo:orders", () =>
      paginate<any>((page) =>
        wooFetch(credentials, `/orders?per_page=100&page=${page}&after=${after}`)
      )
    );

    for (const o of orders) {
      let customerId: string | null = null;
      const billing = o.billing;
      if (billing?.email) {
        const [c] = await db
          .insert(customersTable)
          .values({
            userId,
            platform: "woocommerce",
            externalId: String(o.customer_id || `guest-${o.id}`),
            email: billing.email,
            name: `${billing.first_name ?? ""} ${billing.last_name ?? ""}`.trim(),
            phone: billing.phone || null,
          })
          .onConflictDoUpdate({
            target: [customersTable.userId, customersTable.platform, customersTable.externalId],
            set: { email: billing.email },
          })
          .returning({ id: customersTable.id });
        customerId = c?.id ?? null;
        result.customersAdded += 1;
      }

      const statusMap: Record<string, string> = {
        completed: "fulfilled",
        processing: "paid",
        refunded: "refunded",
        cancelled: "cancelled",
        pending: "pending",
      };

      await db
        .insert(ordersTable)
        .values({
          userId,
          platform: "woocommerce",
          externalId: String(o.id),
          orderNumber: `#${o.number ?? o.id}`,
          customerId,
          subtotal: o.subtotal || "0",
          shipping: o.shipping_total || "0",
          tax: o.total_tax || "0",
          totalAmount: o.total || "0",
          status: statusMap[o.status] ?? "pending",
          orderedAt: new Date(o.date_created),
        })
        .onConflictDoUpdate({
          target: [ordersTable.userId, ordersTable.platform, ordersTable.externalId],
          set: { status: statusMap[o.status] ?? "pending", totalAmount: o.total || "0" },
        });
      result.ordersAdded += 1;
    }

    logger.info({ userId, orders: result.ordersAdded, products: result.productsAdded }, "WooCommerce sync ok");
    return result;
  },
};
