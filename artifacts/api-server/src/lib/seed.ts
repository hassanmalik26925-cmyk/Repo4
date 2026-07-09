import { db } from "@workspace/db";
import {
  customersTable,
  productsTable,
  ordersTable,
  orderItemsTable,
  adCampaignsTable,
  adMetricsTable,
  integrationsTable,
  activitiesTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { ActivityService } from "../services/ActivityService";

const PRODUCT_CATALOG = [
  { name: "Wireless Earbuds Pro", category: "Audio", price: 89.99, cogs: 28.5, stock: 142 },
  { name: "Portable Charger 20K", category: "Accessories", price: 49.99, cogs: 14.0, stock: 218 },
  { name: "Laptop Stand Adjustable", category: "Office", price: 74.5, cogs: 21.0, stock: 87 },
  { name: "Mechanical Keyboard", category: "Office", price: 149.99, cogs: 56.0, stock: 8 },
  { name: "Webcam 4K Pro", category: "Office", price: 149.99, cogs: 48.0, stock: 38 },
  { name: "USB-C Cable Pack", category: "Accessories", price: 19.99, cogs: 3.5, stock: 0 },
];

const CUSTOMERS = [
  { name: "Emma Thompson", email: "emma@example.com", phone: "+1 415 555 0142" },
  { name: "James Wilson", email: "james@example.com", phone: "+1 415 555 0188" },
  { name: "Sophia Garcia", email: "sophia@example.com", phone: "+1 415 555 0173" },
  { name: "Liam Chen", email: "liam@example.com", phone: "+1 415 555 0119" },
  { name: "Olivia Patel", email: "olivia@example.com", phone: "+1 415 555 0107" },
  { name: "Noah Brown", email: "noah@example.com", phone: "+1 415 555 0151" },
  { name: "Ava Martin", email: "ava@example.com", phone: "+1 415 555 0166" },
];

const PLATFORMS = ["shopify", "woocommerce", "direct"];
const STATUSES = ["paid", "fulfilled", "fulfilled", "fulfilled", "pending", "cancelled", "refunded"];

const CAMPAIGNS = [
  { name: "Brand Search Google", channel: "google", baseSpend: 47, baseRoas: 7.0, baseCtr: 4.2 },
  { name: "Retargeting Meta", channel: "meta", baseSpend: 97, baseRoas: 5.6, baseCtr: 2.1 },
  { name: "Google Shopping", channel: "google", baseSpend: 207, baseRoas: 3.9, baseCtr: 1.5 },
  { name: "Summer Sale Meta", channel: "meta", baseSpend: 280, baseRoas: 3.75, baseCtr: 1.9 },
  { name: "TikTok Awareness", channel: "tiktok", baseSpend: 60, baseRoas: 2.4, baseCtr: 3.1 },
];

function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export async function seedDemoData(userId: string): Promise<void> {
  const r = rand(userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));

  // Integrations (placeholder rows so the user sees them in Settings)
  for (const p of ["shopify", "woocommerce", "meta_ads", "google_ads"]) {
    await db
      .insert(integrationsTable)
      .values({
        userId,
        platform: p,
        displayName:
          p === "meta_ads"
            ? "Meta Ads"
            : p === "google_ads"
              ? "Google Ads"
              : p === "shopify"
                ? "Shopify"
                : "WooCommerce",
        status: p === "shopify" || p === "meta_ads" ? "connected" : "disconnected",
        lastSyncAt: p === "shopify" || p === "meta_ads" ? new Date() : null,
      })
      .onConflictDoNothing();
  }

  // Products
  const productIds: Array<{ id: string; price: number; cogs: number }> = [];
  for (const pr of PRODUCT_CATALOG) {
    const [p] = await db
      .insert(productsTable)
      .values({
        userId,
        platform: "manual",
        externalId: `seed-${pr.name}`,
        name: pr.name,
        category: pr.category,
        price: String(pr.price),
        cogs: String(pr.cogs),
        stock: pr.stock,
      })
      .onConflictDoUpdate({
        target: [
          productsTable.userId,
          productsTable.platform,
          productsTable.externalId,
        ],
        set: { name: pr.name, price: String(pr.price) },
      })
      .returning({ id: productsTable.id });
    if (p) productIds.push({ id: p.id, price: pr.price, cogs: pr.cogs });
  }

  // Customers
  const customerIds: string[] = [];
  for (const c of CUSTOMERS) {
    const [row] = await db
      .insert(customersTable)
      .values({
        userId,
        platform: "shopify",
        externalId: `seed-${c.email}`,
        email: c.email,
        name: c.name,
        phone: c.phone,
      })
      .onConflictDoUpdate({
        target: [
          customersTable.userId,
          customersTable.platform,
          customersTable.externalId,
        ],
        set: { name: c.name },
      })
      .returning({ id: customersTable.id });
    if (row) customerIds.push(row.id);
  }

  await seedTimeSeries(userId, productIds, customerIds);

  // Initial activities
  await ActivityService.log({
    userId,
    type: "account.created",
    title: "Account ready",
    description: "Pulse Commerce dashboard initialized with sample data",
  });
  await ActivityService.log({
    userId,
    type: "sync.completed",
    title: "Shopify synced",
    description: "Initial seed of products, orders, and customers",
    entityType: "integration",
  });
}

// Orders, order items, and ad metrics all carry timestamps relative to "now"
// at seed time. This is pulled out on its own so demo accounts can have
// their time series regenerated fresh (see refreshDemoDataIfStale) without
// re-touching products/customers/campaigns/integrations.
async function seedTimeSeries(
  userId: string,
  productIds: Array<{ id: string; price: number; cogs: number }>,
  customerIds: string[],
): Promise<void> {
  const r = rand(userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + Date.now());

  // Orders — last 90 days, ~3-5 per day on average
  const now = new Date();
  let orderCounter = 10000;
  for (let dayOffset = 90; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - dayOffset);
    const dailyOrders = 2 + Math.floor(r() * 4);
    for (let i = 0; i < dailyOrders; i++) {
      orderCounter += 1;
      const product = productIds[Math.floor(r() * productIds.length)]!;
      const qty = 1 + Math.floor(r() * 4);
      const platform = PLATFORMS[Math.floor(r() * PLATFORMS.length)]!;
      const status = STATUSES[Math.floor(r() * STATUSES.length)]!;
      const subtotal = product.price * qty;
      const shipping = 5 + r() * 7;
      const tax = subtotal * 0.08;
      const total = subtotal + shipping + tax;
      const orderedAt = new Date(date);
      orderedAt.setUTCHours(8 + Math.floor(r() * 12));
      const customerId = customerIds[Math.floor(r() * customerIds.length)] ?? null;

      const [order] = await db
        .insert(ordersTable)
        .values({
          userId,
          platform,
          externalId: `seed-${orderCounter}`,
          orderNumber: `ORD-${orderCounter}`,
          customerId,
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          tax: tax.toFixed(2),
          totalAmount: total.toFixed(2),
          status,
          orderedAt,
        })
        .onConflictDoNothing()
        .returning({ id: ordersTable.id });
      if (!order) continue;
      await db.insert(orderItemsTable).values({
        orderId: order.id,
        productId: product.id,
        name: PRODUCT_CATALOG.find((x) => x.price === product.price)?.name ?? "Item",
        quantity: qty,
        unitPrice: product.price.toFixed(2),
        unitCost: product.cogs.toFixed(2),
      });
    }
  }

  // Recompute customer totals
  for (const id of customerIds) {
    await db
      .update(customersTable)
      .set({
        totalSpent: sql`COALESCE((SELECT SUM(${ordersTable.totalAmount}) FROM ${ordersTable} WHERE ${ordersTable.customerId} = ${id} AND ${ordersTable.status} IN ('paid','fulfilled')), 0)`,
        ordersCount: sql`COALESCE((SELECT COUNT(*) FROM ${ordersTable} WHERE ${ordersTable.customerId} = ${id}), 0)`,
      })
      .where(sql`${customersTable.id} = ${id}`);
  }

  // Marketing campaigns
  for (const c of CAMPAIGNS) {
    const [camp] = await db
      .insert(adCampaignsTable)
      .values({
        userId,
        channel: c.channel,
        externalId: `seed-${c.name}`,
        name: c.name,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [
          adCampaignsTable.userId,
          adCampaignsTable.channel,
          adCampaignsTable.externalId,
        ],
        set: { name: c.name },
      })
      .returning({ id: adCampaignsTable.id });
    if (!camp) continue;
    for (let dayOffset = 90; dayOffset >= 0; dayOffset--) {
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() - dayOffset);
      const dateStr = d.toISOString().slice(0, 10);
      const variation = 0.7 + r() * 0.6;
      const spend = c.baseSpend * variation;
      const revenue = spend * (c.baseRoas * (0.85 + r() * 0.3));
      const impressions = Math.floor(spend * 1500 * (0.8 + r() * 0.4));
      const clicks = Math.floor(impressions * (c.baseCtr / 100));
      const conversions = Math.floor(clicks * (0.04 + r() * 0.04));
      await db
        .insert(adMetricsTable)
        .values({
          userId,
          campaignId: camp.id,
          date: dateStr,
          impressions,
          clicks,
          conversions,
          spend: spend.toFixed(2),
          revenue: revenue.toFixed(2),
        })
        .onConflictDoUpdate({
          target: [adMetricsTable.campaignId, adMetricsTable.date],
          set: { impressions, clicks, conversions, spend: spend.toFixed(2), revenue: revenue.toFixed(2) },
        });
    }
  }
}

// Demo accounts are shared/reused across time, so the sample data seeded at
// account-creation time can silently go stale (orders/ad metrics stop
// covering "today"), which makes recent date ranges (7d/14d/30d) look empty
// even though the account is fully wired up. Call this on every demo login
// so the time series always covers up through today.
export async function refreshDemoDataIfStale(userId: string): Promise<void> {
  const [latest] = await db
    .select({ orderedAt: ordersTable.orderedAt })
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(sql`${ordersTable.orderedAt} DESC`)
    .limit(1);

  const staleCutoff = new Date();
  staleCutoff.setUTCDate(staleCutoff.getUTCDate() - 1);
  if (latest && latest.orderedAt > staleCutoff) return;

  const [products, customers] = await Promise.all([
    db
      .select({ id: productsTable.id, price: productsTable.price, cogs: productsTable.cogs })
      .from(productsTable)
      .where(eq(productsTable.userId, userId)),
    db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.userId, userId)),
  ]);
  if (products.length === 0) return;

  // Orders cascade-delete their order items; ad metrics are cleared per-user.
  await db.delete(ordersTable).where(eq(ordersTable.userId, userId));
  await db.delete(adMetricsTable).where(eq(adMetricsTable.userId, userId));

  await seedTimeSeries(
    userId,
    products.map((p) => ({ id: p.id, price: Number(p.price), cogs: Number(p.cogs) })),
    customers.map((c) => c.id),
  );
}
