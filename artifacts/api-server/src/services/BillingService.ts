import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getWhopClient } from "../lib/whopClient";

// A scheduled cancellation still grants access through the paid billing period.
const ACTIVE_STATUSES = new Set(["active", "trialing", "canceling"]);
const STATUS_TTL_MS = 60_000;
const INACTIVE_STATUS_TTL_MS = 15_000;

type BillingStatus = {
  hasAccess: boolean;
  status: string;
  planName: string;
  price: number;
  currency: string;
  renewalEnd: string | null;
  cancelAtPeriodEnd: boolean;
  manageUrl: string | null;
  membershipId: string | null;
};

function inactiveStatus(): BillingStatus {
  return {
    hasAccess: false,
    status: "inactive",
    planName: "CommercePulse Analytics",
    price: 9,
    currency: "USD",
    renewalEnd: null,
    cancelAtPeriodEnd: false,
    manageUrl: null,
    membershipId: null,
  };
}

function configuredBilling(): {
  companyId: string;
  planId: string;
  productId: string;
} {
  const companyId = process.env.WHOP_COMPANY_ID;
  const planId = process.env.WHOP_PLAN_ID;
  const productId = process.env.WHOP_PRODUCT_ID;
  if (!companyId || !planId || !productId) {
    throw new Error("Whop billing configuration is incomplete.");
  }
  return { companyId, planId, productId };
}

async function findMembershipForUser(userId: string) {
  const { companyId, planId } = configuredBilling();
  const client = await getWhopClient();
  const memberships = await client.memberships.list({
    company_id: companyId,
    plan_ids: [planId],
    first: 100,
    order: "created_at",
    direction: "desc",
  });

  // The SDK page is async-iterable, so this scans beyond the first 100
  // memberships when an account has a long billing history. Keep the newest
  // matching inactive membership as a fallback, but prefer any active match:
  // a later checkout can leave an older membership active while a newer one
  // is canceled or expired.
  let latestMatch:
    | (typeof memberships.data)[number]
    | undefined;
  for await (const membership of memberships) {
    const metadata = membership.metadata;
    if (metadata?.commercepulse_user_id !== userId) continue;
    latestMatch ??= membership;
    if (ACTIVE_STATUSES.has(membership.status)) return membership;
  }
  return latestMatch;
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return inactiveStatus();
  if (user.isDemo === "true") {
    return {
      ...inactiveStatus(),
      hasAccess: true,
      status: "demo",
    };
  }

  const cacheTtl =
    user.billingStatus === "inactive"
      ? INACTIVE_STATUS_TTL_MS
      : STATUS_TTL_MS;
  const recentlyChecked =
    user.billingLastCheckedAt &&
    Date.now() - user.billingLastCheckedAt.getTime() < cacheTtl;
  if (recentlyChecked) {
    return {
      ...inactiveStatus(),
      hasAccess: ACTIVE_STATUSES.has(user.billingStatus),
      status: user.billingStatus,
      renewalEnd: user.billingRenewalEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: user.billingCancelAtPeriodEnd === "true",
      manageUrl: user.billingManageUrl,
      membershipId: user.whopMembershipId,
    };
  }

  try {
    const membership = await findMembershipForUser(userId);
    const hasAccess = !!membership && ACTIVE_STATUSES.has(membership.status);
    const status = membership?.status ?? "inactive";
    const planName = membership?.product?.title ?? "CommercePulse Analytics";
    const renewalEnd = membership?.renewal_period_end ?? null;
    const cancelAtPeriodEnd = membership?.cancel_at_period_end ?? false;
    const membershipId = membership?.id ?? null;

    await db
      .update(usersTable)
      .set({
        billingStatus: status,
        whopMembershipId: membershipId,
        billingManageUrl: membership?.manage_url ?? null,
        billingRenewalEnd: renewalEnd ? new Date(renewalEnd) : null,
        billingCancelAtPeriodEnd: String(cancelAtPeriodEnd),
        billingLastCheckedAt: new Date(),
      })
      .where(eq(usersTable.id, userId));

    return {
      hasAccess,
      status,
      planName,
      price: 9,
      currency: "USD",
      renewalEnd,
      cancelAtPeriodEnd,
      manageUrl: membership?.manage_url ?? null,
      membershipId,
    };
  } catch {
    // A billing provider outage must fail closed for analytics access.
    return inactiveStatus();
  }
}

export async function createCheckout(userId: string, redirectUrl: string) {
  const { companyId, planId } = configuredBilling();
  const client = await getWhopClient();
  return client.checkoutConfigurations.create({
    account_id: companyId,
    plan_id: planId,
    redirect_url: redirectUrl,
    metadata: {
      commercepulse_user_id: userId,
    },
    "Idempotency-Key": `commercepulse-checkout-${userId}`,
  });
}

export async function cancelSubscription(userId: string) {
  const billing = await getBillingStatus(userId);
  if (!billing.membershipId) {
    throw new Error("No active CommercePulse membership was found.");
  }
  const client = await getWhopClient();
  await client.memberships.cancel(billing.membershipId, {
    cancellation_mode: "at_period_end",
  });
  await db
    .update(usersTable)
    .set({
      billingCancelAtPeriodEnd: "true",
      billingLastCheckedAt: null,
    })
    .where(eq(usersTable.id, userId));
  return getBillingStatus(userId);
}