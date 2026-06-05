/**
 * PayPal REST API v2 adapter.
 * Syncs transactions as orders.
 * Docs: https://developer.paypal.com/docs/api/transaction-search/v1/
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, ordersTable, customersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const BASE_LIVE = "https://api-m.paypal.com";
const BASE_SANDBOX = "https://api-m.sandbox.paypal.com";
const TOKEN_PATH = "/v1/oauth2/token";

interface PayPalCreds extends Record<string, unknown> {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
}

function isPayPalCreds(c: Record<string, unknown>): c is PayPalCreds {
  return typeof c.clientId === "string" && typeof c.clientSecret === "string";
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(creds: PayPalCreds): Promise<string> {
  const base = creds.sandbox ? BASE_SANDBOX : BASE_LIVE;
  const key = creds.clientId;
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expiresAt - 30_000) return cached.token;

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const res = await fetch(`${base}${TOKEN_PATH}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1_000 });
  return data.access_token;
}

const limiter = new RateLimiter(5, 1_000);

async function ppFetch<T>(creds: PayPalCreds, path: string, params: Record<string, string> = {}): Promise<T> {
  await limiter.throttle();
  const base = creds.sandbox ? BASE_SANDBOX : BASE_LIVE;
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const token = await getToken(creds);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (res.status === 429) { await sleep(2_000); return ppFetch(creds, path, params); }
  if (!res.ok) throw new Error(`PayPal ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function isoFull(d: Date) { return d.toISOString().split(".")[0] + "-0700"; }

export const paypalAdapter: IntegrationAdapter = {
  platform: "paypal",
  displayName: "PayPal",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isPayPalCreds(credentials))
      throw new Error("clientId and clientSecret are required");
    await getToken(credentials);
  },

  async sync(userId, credentials) {
    if (!isPayPalCreds(credentials)) throw new Error("Invalid PayPal credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 31); // PayPal allows max 31d per request

    // Run up to 3 x 31-day windows for ~90 days
    for (let window = 0; window < 3; window++) {
      const windowEnd = new Date(endDate);
      windowEnd.setDate(endDate.getDate() - window * 31);
      const windowStart = new Date(windowEnd);
      windowStart.setDate(windowEnd.getDate() - 31);

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await withRetry("paypal:transactions", () =>
          ppFetch<{
            transaction_details: Array<{
              transaction_info: {
                transaction_id: string;
                transaction_amount: { value: string };
                fee_amount?: { value: string };
                transaction_status: string;
                transaction_initiation_date: string;
              };
              payer_info?: { email_address?: string; payer_name?: { full_name?: string }; payer_id?: string };
            }>;
            page: number;
            total_pages: number;
          }>(credentials, "/v1/reporting/transactions", {
            start_date: isoFull(windowStart),
            end_date: isoFull(windowEnd),
            page: String(page),
            page_size: "100",
            fields: "all",
            transaction_type: "T0006", // Express checkout
          }).catch(() => ({ transaction_details: [] as any[], page: 1, total_pages: 1 }))
        );

        for (const tx of (data as any).transaction_details ?? []) {
          const info = tx.transaction_info;
          const payer = tx.payer_info;
          const amt = parseFloat(info.transaction_amount?.value ?? "0");
          if (amt <= 0) continue;

          let customerId: string | null = null;
          if (payer?.payer_id) {
            const [c] = await db
              .insert(customersTable)
              .values({
                userId,
                platform: "paypal",
                externalId: payer.payer_id,
                email: payer.email_address ?? `${payer.payer_id}@paypal.local`,
                name: payer.payer_name?.full_name ?? payer.payer_id,
                phone: null,
              })
              .onConflictDoUpdate({
                target: [customersTable.userId, customersTable.platform, customersTable.externalId],
                set: { email: payer.email_address ?? `${payer.payer_id}@paypal.local` },
              })
              .returning({ id: customersTable.id });
            customerId = c?.id ?? null;
            result.customersAdded += 1;
          }

          const statusMap: Record<string, string> = {
            S: "paid", P: "pending", V: "refunded", D: "cancelled",
          };

          await db
            .insert(ordersTable)
            .values({
              userId,
              platform: "paypal",
              externalId: info.transaction_id,
              orderNumber: `PP-${info.transaction_id.slice(-8)}`,
              customerId,
              subtotal: String(amt),
              shipping: "0",
              tax: "0",
              totalAmount: String(amt),
              status: statusMap[info.transaction_status] ?? "paid",
              orderedAt: new Date(info.transaction_initiation_date),
            })
            .onConflictDoUpdate({
              target: [ordersTable.userId, ordersTable.platform, ordersTable.externalId],
              set: { status: statusMap[info.transaction_status] ?? "paid", totalAmount: String(amt) },
            });
          result.ordersAdded += 1;
        }

        page += 1;
        hasMore = page <= ((data as any).total_pages ?? 1);
      }
    }

    logger.info({ userId, orders: result.ordersAdded }, "PayPal sync ok");
    return result;
  },
};
