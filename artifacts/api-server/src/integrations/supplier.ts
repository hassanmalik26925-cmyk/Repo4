/**
 * Generic REST supplier adapter.
 * Authenticates via a configurable API-key header.
 * Upserts products from the stock endpoint into the products table.
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter } from "../lib/rateLimit";

interface SupplierCreds extends Record<string, unknown> {
  baseUrl: string;
  apiKey: string;
  apiKeyHeader?: string;   // default: "X-Api-Key"
  stockPath?: string;      // default: "/inventory"
  listKey?: string;        // JSON key holding the array, empty = bare array
  fieldSku?: string;       // default: "sku"
  fieldStock?: string;     // default: "stock_quantity"
  fieldName?: string;      // default: "name"
  fieldPrice?: string;     // default: "unit_price"
}

function isSupplierCreds(c: Record<string, unknown>): c is SupplierCreds {
  return typeof c.baseUrl === "string" && typeof c.apiKey === "string";
}

const limiter = new RateLimiter(5, 1_000);

async function supplierFetch<T>(creds: SupplierCreds, path: string): Promise<T> {
  await limiter.throttle();
  const url = creds.baseUrl.replace(/\/$/, "") + path;
  const headerName = (creds.apiKeyHeader as string | undefined) ?? "X-Api-Key";
  const res = await fetch(url, {
    headers: { [headerName]: creds.apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Supplier ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function extractList(data: unknown, listKey: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && listKey) {
    const v = (data as Record<string, unknown>)[listKey];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export const supplierAdapter: IntegrationAdapter = {
  platform: "supplier",
  displayName: "Supplier (REST)",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isSupplierCreds(credentials))
      throw new Error("baseUrl and apiKey are required");
    const path = (credentials.stockPath as string | undefined) ?? "/inventory";
    await supplierFetch(credentials, path);
  },

  async sync(userId, credentials) {
    if (!isSupplierCreds(credentials)) throw new Error("Invalid supplier credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const path = (credentials.stockPath as string | undefined) ?? "/inventory";
    const listKey = (credentials.listKey as string | undefined) ?? "products";
    const fieldSku = (credentials.fieldSku as string | undefined) ?? "sku";
    const fieldStock = (credentials.fieldStock as string | undefined) ?? "stock_quantity";
    const fieldName = (credentials.fieldName as string | undefined) ?? "name";
    const fieldPrice = (credentials.fieldPrice as string | undefined) ?? "unit_price";

    const raw = await withRetry("supplier:stock", () =>
      supplierFetch<unknown>(credentials, path)
    );
    const items = extractList(raw, listKey);

    for (const item of items) {
      const row = item as Record<string, unknown>;
      const sku = String(row[fieldSku] ?? "");
      if (!sku) continue;

      await db
        .insert(productsTable)
        .values({
          userId,
          platform: "supplier",
          externalId: sku,
          name: String(row[fieldName] ?? sku),
          sku,
          category: String(row["category"] ?? "Uncategorized"),
          price: String(Number(row[fieldPrice] ?? 0)),
          cogs: String(Number(row["cost"] ?? row["cogs"] ?? 0)),
          stock: Number(row[fieldStock] ?? 0),
        })
        .onConflictDoUpdate({
          target: [productsTable.userId, productsTable.platform, productsTable.externalId],
          set: {
            stock: Number(row[fieldStock] ?? 0),
            price: String(Number(row[fieldPrice] ?? 0)),
          },
        });
      result.productsAdded += 1;
    }

    logger.info({ userId, products: result.productsAdded }, "Supplier sync ok");
    return result;
  },
};
