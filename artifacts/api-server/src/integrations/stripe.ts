/**
 * Stripe adapter — syncs charges as orders and captures fee data.
 * Docs: https://stripe.com/docs/api
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, ordersTable, customersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const BASE = "https://api.stripe.com/v1";

interface StripeCreds extends Record<string, unknown> {
  secretKey: string; // sk_live_... or sk_test_...
}

function isStripeCreds(c: Record<string, unknown>): c is StripeCreds {
  return typeof c.secretKey === "string" && c.secretKey.startsWith("sk_");
}

const limiter = new RateLimiter(10, 1_000);

async function stripeFetch<T>(creds: StripeCreds, path: string, params: Record<string, string> = {}): Promise<T> {
  await limiter.throttle();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${creds.secretKey}`,
      "Stripe-Version": "2024-06-20",
    },
  });
  if (res.status === 429) { await sleep(2_000); return stripeFetch(creds, path, params); }
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const stripeAdapter: IntegrationAdapter = {
  platform: "stripe",
  displayName: "Stripe",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isStripeCreds(credentials))
      throw new Error("secretKey is required (sk_live_... or sk_test_...)");
    await stripeFetch(credentials, "/account");
  },

  async sync(userId, credentials) {
    if (!isStripeCreds(credentials)) throw new Error("Invalid Stripe credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const since = Math.floor(Date.now() / 1000) - 90 * 86400;
    let startingAfter: string | undefined;

    do {
      const params: Record<string, string> = {
        limit: "100",
        created: `gte:${since}`,
        expand: ["data.balance_transaction", "data.customer"].join(","),
      };
      if (startingAfter) params.starting_after = startingAfter;

      const charges = await withRetry("stripe:charges", () =>
        stripeFetch<{
          data: Array<{
            id: string;
            amount: number;
            amount_refunded: number;
            fee?: number;
            balance_transaction?: { fee: number; net: number };
            customer?: string | { id: string; email?: string; name?: string };
            created: number;
            status: string;
            refunded: boolean;
            disputed: boolean;
            currency: string;
            description?: string;
          }>;
          has_more: boolean;
        }>(credentials, "/charges", params)
      );

      for (const ch of charges.data) {
        const totalAmt = ch.amount / 100;
        const fee = (ch.balance_transaction as any)?.fee ?? 0;
        const netAmt = (ch.balance_transaction as any)?.net ?? ch.amount;

        let customerId: string | null = null;
        const custObj = typeof ch.customer === "object" ? ch.customer : null;
        if (custObj?.id) {
          const [c] = await db
            .insert(customersTable)
            .values({
              userId,
              platform: "stripe",
              externalId: custObj.id,
              email: custObj.email ?? `${custObj.id}@stripe.local`,
              name: custObj.name ?? custObj.id,
              phone: null,
            })
            .onConflictDoUpdate({
              target: [customersTable.userId, customersTable.platform, customersTable.externalId],
              set: { email: custObj.email ?? `${custObj.id}@stripe.local` },
            })
            .returning({ id: customersTable.id });
          customerId = c?.id ?? null;
          result.customersAdded += 1;
        }

        const status = ch.refunded ? "refunded" : ch.status === "succeeded" ? "paid" : "pending";

        await db
          .insert(ordersTable)
          .values({
            userId,
            platform: "stripe",
            externalId: ch.id,
            orderNumber: `STR-${ch.id.slice(-8)}`,
            customerId,
            subtotal: String(totalAmt),
            shipping: "0",
            tax: "0",
            totalAmount: String(totalAmt),
            status,
            orderedAt: new Date(ch.created * 1_000),
          })
          .onConflictDoUpdate({
            target: [ordersTable.userId, ordersTable.platform, ordersTable.externalId],
            set: { status, totalAmount: String(totalAmt) },
          });
        result.ordersAdded += 1;
      }

      startingAfter = charges.has_more ? charges.data[charges.data.length - 1]?.id : undefined;
    } while (startingAfter);

    logger.info({ userId, orders: result.ordersAdded }, "Stripe sync ok");
    return result;
  },
};
