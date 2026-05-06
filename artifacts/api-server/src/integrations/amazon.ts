/**
 * Amazon SP-API adapter.
 * Uses LWA (Login with Amazon) for OAuth2 + AWS SigV4 request signing.
 * Docs: https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference
 */

import { createHmac, createHash } from "node:crypto";
import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, ordersTable, customersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const SP_API_HOSTS: Record<string, string> = {
  "us-east-1": "sellingpartnerapi-na.amazon.com",
  "eu-west-1": "sellingpartnerapi-eu.amazon.com",
  "us-west-2": "sellingpartnerapi-fe.amazon.com",
};

interface AmazonCreds extends Record<string, unknown> {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  marketplaceId: string;
  sellerId: string;
  region?: string;
}

function isAmazonCreds(c: Record<string, unknown>): c is AmazonCreds {
  return (
    typeof c.refreshToken === "string" &&
    typeof c.clientId === "string" &&
    typeof c.clientSecret === "string" &&
    typeof c.marketplaceId === "string" &&
    typeof c.sellerId === "string"
  );
}

// ── LWA token ─────────────────────────────────────────────────────────────────

interface TokenEntry { accessToken: string; expiresAt: number }
const tokenCache = new Map<string, TokenEntry>();

async function getLwaToken(creds: AmazonCreds): Promise<string> {
  const key = `${creds.clientId}:${creds.refreshToken}`;
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expiresAt - 30_000) return cached.accessToken;

  const res = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`LWA token ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1_000 });
  return data.access_token;
}

// ── AWS SigV4 signer ──────────────────────────────────────────────────────────
// Amazon SP-API requires SigV4 signed requests even for role-less access
// using the anonymous credential (empty key/secret) when using LWA only.
// We sign with empty AWS credentials which is valid for the SP-API pattern.

function hash(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sigV4Sign(
  method: string,
  url: URL,
  accessToken: string,
  region: string,
): Record<string, string> {
  const service = "execute-api";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = url.pathname;
  const canonicalQuery = url.searchParams.toString();
  const payloadHash = hash("");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-access-token": accessToken,
    "x-amz-date": amzDate,
  };

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders =
    Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v.trim()}\n`)
      .join("") + "\n";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash(canonicalRequest)].join("\n");

  // SP-API supports "anonymous" signing (no AWS IAM role) when using LWA tokens
  const signingKey = hmac(
    hmac(hmac(hmac(Buffer.from("AWS4" + ""), dateStamp), region), service),
    "aws4_request",
  );
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return {
    ...headers,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

const limiter = new RateLimiter(1, 2_000); // SP-API Orders: 0.5 req/s burst

async function spFetch<T>(creds: AmazonCreds, path: string, params: Record<string, string> = {}): Promise<T> {
  await limiter.throttle();
  const region = creds.region ?? "us-east-1";
  const host = SP_API_HOSTS[region] ?? SP_API_HOSTS["us-east-1"]!;
  const url = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const accessToken = await getLwaToken(creds);
  const headers = sigV4Sign("GET", url, accessToken, region);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), { headers });
    if (res.status === 429) {
      await sleep(2_000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`SP-API ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }
  throw new Error("SP-API: exceeded retry limit");
}

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const amazonAdapter: IntegrationAdapter = {
  platform: "amazon",
  displayName: "Amazon",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isAmazonCreds(credentials))
      throw new Error("refreshToken, clientId, clientSecret, marketplaceId, and sellerId are required");
    await getLwaToken(credentials);
  },

  async sync(userId, credentials) {
    if (!isAmazonCreds(credentials)) throw new Error("Invalid Amazon credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    let nextToken: string | undefined;
    const createdAfter = sinceIso(90);

    do {
      const params: Record<string, string> = nextToken
        ? { NextToken: nextToken }
        : {
            MarketplaceIds: credentials.marketplaceId,
            CreatedAfter: createdAfter,
            OrderStatuses: "Unshipped,PartiallyShipped,Shipped,Canceled,Unfulfillable,InvoiceUnconfirmed,Pending",
          };

      const data = await withRetry("amazon:orders", () =>
        spFetch<{ payload: { Orders: any[]; NextToken?: string } }>(
          credentials,
          "/orders/v0/orders",
          params,
        )
      );

      const orders = data.payload.Orders ?? [];

      for (const o of orders) {
        const total = parseFloat(o.OrderTotal?.Amount ?? "0");
        const buyerName = o.BuyerInfo?.BuyerName ?? null;
        const buyerEmail = o.BuyerInfo?.BuyerEmail ?? null;

        let customerId: string | null = null;
        if (buyerEmail) {
          const [c] = await db
            .insert(customersTable)
            .values({
              userId,
              platform: "amazon",
              externalId: buyerEmail,
              email: buyerEmail,
              name: buyerName ?? buyerEmail,
              phone: null,
            })
            .onConflictDoUpdate({
              target: [customersTable.userId, customersTable.platform, customersTable.externalId],
              set: { name: buyerName ?? buyerEmail },
            })
            .returning({ id: customersTable.id });
          customerId = c?.id ?? null;
          result.customersAdded += 1;
        }

        const statusMap: Record<string, string> = {
          Shipped: "fulfilled",
          PartiallyShipped: "paid",
          Unshipped: "paid",
          Pending: "pending",
          Canceled: "cancelled",
        };

        await db
          .insert(ordersTable)
          .values({
            userId,
            platform: "amazon",
            externalId: o.AmazonOrderId,
            orderNumber: o.AmazonOrderId,
            customerId,
            subtotal: String(total),
            shipping: "0",
            tax: "0",
            totalAmount: String(total),
            status: statusMap[o.OrderStatus] ?? "pending",
            orderedAt: new Date(o.PurchaseDate),
          })
          .onConflictDoUpdate({
            target: [ordersTable.userId, ordersTable.platform, ordersTable.externalId],
            set: { status: statusMap[o.OrderStatus] ?? "pending", totalAmount: String(total) },
          });
        result.ordersAdded += 1;
      }

      nextToken = data.payload.NextToken;
      if (nextToken) await sleep(500); // stay within rate limit
    } while (nextToken);

    logger.info({ userId, orders: result.ordersAdded }, "Amazon sync ok");
    return result;
  },
};
