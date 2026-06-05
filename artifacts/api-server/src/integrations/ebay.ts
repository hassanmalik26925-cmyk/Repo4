/**
 * eBay Sell Feed + Order Management REST API adapter.
 * Uses OAuth2 client credentials flow.
 * Docs: https://developer.ebay.com/api-docs/sell/fulfillment/overview.html
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, ordersTable, customersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const API_BASE = "https://api.ebay.com";

interface EbayCreds extends Record<string, unknown> {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  marketplaceId?: string; // e.g. EBAY_US
}

function isEbayCreds(c: Record<string, unknown>): c is EbayCreds {
  return (
    typeof c.clientId === "string" &&
    typeof c.clientSecret === "string" &&
    typeof c.refreshToken === "string"
  );
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(creds: EbayCreds): Promise<string> {
  const key = creds.clientId;
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expiresAt - 30_000) return cached.token;

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      scope: "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
    }),
  });
  if (!res.ok) throw new Error(`eBay OAuth ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1_000 });
  return data.access_token;
}

const limiter = new RateLimiter(5, 1_000);

async function ebayFetch<T>(creds: EbayCreds, path: string, params: Record<string, string> = {}): Promise<T> {
  await limiter.throttle();
  const token = await getToken(creds);
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": (creds.marketplaceId as string | undefined) ?? "EBAY_US",
    },
  });
  if (res.status === 429) { await sleep(2_000); return ebayFetch(creds, path, params); }
  if (!res.ok) throw new Error(`eBay ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

const STATUS_MAP: Record<string, string> = {
  FULFILLED: "fulfilled",
  PAID: "paid",
  CANCELLED: "cancelled",
  PENDING: "pending",
  PAYMENT_INITIATED: "pending",
  ALL_FUNDS_RELEASED: "paid",
};

export const ebayAdapter: IntegrationAdapter = {
  platform: "ebay",
  displayName: "eBay",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isEbayCreds(credentials))
      throw new Error("clientId, clientSecret, and refreshToken are required");
    await getToken(credentials);
  },

  async sync(userId, credentials) {
    if (!isEbayCreds(credentials)) throw new Error("Invalid eBay credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceIso = since.toISOString();

    let offset = 0;
    const limit = 50;
    let total = Infinity;

    while (offset < total) {
      const data = await withRetry("ebay:orders", () =>
        ebayFetch<{
          orders: Array<{
            orderId: string;
            buyer: { username: string };
            pricingSummary: { total: { value: string }; deliveryCost?: { value: string }; tax?: { value: string } };
            orderFulfillmentStatus: string;
            creationDate: string;
          }>;
          total?: number;
          next?: string;
        }>(credentials, "/sell/fulfillment/v1/order", {
          filter: `creationdate:[${sinceIso}..]`,
          limit: String(limit),
          offset: String(offset),
        })
      );

      total = data.total ?? (data.orders?.length ?? 0);

      for (const o of data.orders ?? []) {
        const totalAmt = parseFloat(o.pricingSummary?.total?.value ?? "0");
        const shipping = parseFloat(o.pricingSummary?.deliveryCost?.value ?? "0");
        const tax = parseFloat(o.pricingSummary?.tax?.value ?? "0");
        const subtotal = totalAmt - shipping - tax;

        let customerId: string | null = null;
        if (o.buyer?.username) {
          const [c] = await db
            .insert(customersTable)
            .values({
              userId,
              platform: "ebay",
              externalId: o.buyer.username,
              email: `${o.buyer.username}@ebay-buyer.local`,
              name: o.buyer.username,
              phone: null,
            })
            .onConflictDoUpdate({
              target: [customersTable.userId, customersTable.platform, customersTable.externalId],
              set: { name: o.buyer.username },
            })
            .returning({ id: customersTable.id });
          customerId = c?.id ?? null;
          result.customersAdded += 1;
        }

        await db
          .insert(ordersTable)
          .values({
            userId,
            platform: "ebay",
            externalId: o.orderId,
            orderNumber: `eBay-${o.orderId.slice(-8)}`,
            customerId,
            subtotal: String(subtotal),
            shipping: String(shipping),
            tax: String(tax),
            totalAmount: String(totalAmt),
            status: STATUS_MAP[o.orderFulfillmentStatus] ?? "pending",
            orderedAt: new Date(o.creationDate),
          })
          .onConflictDoUpdate({
            target: [ordersTable.userId, ordersTable.platform, ordersTable.externalId],
            set: { status: STATUS_MAP[o.orderFulfillmentStatus] ?? "pending", totalAmount: String(totalAmt) },
          });
        result.ordersAdded += 1;
      }

      offset += limit;
      if (!data.next) break;
    }

    logger.info({ userId, orders: result.ordersAdded }, "eBay sync ok");
    return result;
  },
};
