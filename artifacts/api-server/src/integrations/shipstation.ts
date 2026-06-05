/**
 * ShipStation REST API v1 adapter.
 * Syncs shipment costs back to order profit calculations.
 * Docs: https://www.shipstation.com/docs/api/
 */

import type { IntegrationAdapter, SyncResult } from "./types";
import { ZERO_SYNC } from "./types";
import { db, ordersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { withRetry, RateLimiter, sleep } from "../lib/rateLimit";

const BASE = "https://ssapi.shipstation.com";

interface ShipStationCreds extends Record<string, unknown> {
  apiKey: string;
  apiSecret: string;
}

function isShipStationCreds(c: Record<string, unknown>): c is ShipStationCreds {
  return typeof c.apiKey === "string" && typeof c.apiSecret === "string";
}

const limiter = new RateLimiter(2, 1_000); // 40 req/min = ~0.67/s, use 2/s to be safe

async function ssFetch<T>(creds: ShipStationCreds, path: string, params: Record<string, string> = {}): Promise<T> {
  await limiter.throttle();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  });
  if (res.status === 429) { await sleep(5_000); return ssFetch(creds, path, params); }
  if (!res.ok) throw new Error(`ShipStation ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export const shipstationAdapter: IntegrationAdapter = {
  platform: "shipstation",
  displayName: "ShipStation",
  requiresCredentials: true,

  async validate(credentials) {
    if (!isShipStationCreds(credentials))
      throw new Error("apiKey and apiSecret are required");
    await ssFetch(credentials, "/accounts/listtags");
  },

  async sync(userId, credentials) {
    if (!isShipStationCreds(credentials)) throw new Error("Invalid ShipStation credentials");
    const result: SyncResult = { ...ZERO_SYNC };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await withRetry("shipstation:shipments", () =>
        ssFetch<{
          shipments: Array<{
            shipmentId: number;
            orderNumber: string;
            shipDate: string;
            shipmentCost: number;
            otherCost: number;
            trackingNumber?: string;
            carrierCode?: string;
            serviceCode?: string;
          }>;
          total: number;
          page: number;
          pages: number;
        }>(credentials, "/shipments", {
          shipDateStart: isoDate(startDate),
          shipDateEnd: isoDate(endDate),
          page: String(page),
          pageSize: "100",
        })
      );

      for (const s of data.shipments ?? []) {
        const shippingCost = s.shipmentCost + s.otherCost;

        // Try to match to an existing order by orderNumber
        await db
          .update(ordersTable)
          .set({ shipping: String(shippingCost) })
          .where(
            and(
              eq(ordersTable.userId, userId),
              eq(ordersTable.orderNumber, s.orderNumber),
            ),
          );
      }

      result.ordersAdded += data.shipments?.length ?? 0;
      hasMore = page < (data.pages ?? 1);
      page += 1;
    }

    logger.info({ userId, shipments: result.ordersAdded }, "ShipStation sync ok");
    return result;
  },
};
