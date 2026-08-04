/**
 * AI Insights Engine — rule-based intelligence that analyzes the user's data
 * and produces actionable, prioritized recommendations.
 *
 * No external AI API required. Runs entirely from the Postgres data.
 */

import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { RevenueService } from "../services/RevenueService";
import { CustomerService } from "../services/CustomerService";
import { MarketingService } from "../services/MarketingService";
import { dateWindow, parseRange } from "../lib/dateRange";
import { db, adCampaignsTable, adMetricsTable, ordersTable, productsTable } from "@workspace/db";
import { eq, and, gte, lte, sum, sql } from "drizzle-orm";
import { GetInsightsResponse, GetInsightsSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

type InsightSeverity = "critical" | "warning" | "positive" | "info";

interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: string;
  action?: string;
  actionTarget?: {
    screen: "dashboard" | "orders" | "reports" | "marketing" | "products" | "settings";
    section?: string;
    entityId?: string;
    focus?: string;
  };
}

function targetForInsight(id: string): Insight["actionTarget"] {
  if (id === "low-stock" || id === "out-of-stock" || id === "low-margin" || id === "thin-margin") {
    return { screen: "products", focus: id === "low-margin" || id === "thin-margin" ? "costs" : "inventory" };
  }
  if (id === "no-data" || id === "revenue-drop") return { screen: "settings", focus: "integrations" };
  if (id.startsWith("roas") || id.includes("campaign") || id === "revenue-surge") {
    return { screen: "marketing", focus: id };
  }
  if (id.startsWith("aov")) return { screen: "reports", section: "sales" };
  return { screen: "reports", section: "overview" };
}

function pct(a: number, b: number) {
  if (b === 0) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

router.get("/insights", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const range = parseRange(req.query.range);
  const win = dateWindow(range);
  const prev = { ...win, from: win.prevFrom, to: win.prevTo, prevFrom: win.prevFrom, prevTo: win.prevTo };

  const insights: Insight[] = [];

  try {
    // ── 1. Revenue & profit health ─────────────────────────────────────────────
    const [revenue, adSpend, ordersCount] = await Promise.all([
      RevenueService.getTotalRevenue(userId, win),
      RevenueService.getTotalAdSpend(userId, win),
      RevenueService.getOrdersCount(userId, win),
    ]);
    const [prevRevenue, prevAdSpend, prevOrders] = await Promise.all([
      RevenueService.getTotalRevenue(userId, prev),
      RevenueService.getTotalAdSpend(userId, prev),
      RevenueService.getOrdersCount(userId, prev),
    ]);

    const profit = revenue - adSpend;
    const prevProfit = prevRevenue - prevAdSpend;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const roas = adSpend > 0 ? revenue / adSpend : 0;
    const cpa = ordersCount > 0 ? adSpend / ordersCount : 0;
    const aov = ordersCount > 0 ? revenue / ordersCount : 0;

    const revChange = pct(revenue, prevRevenue);
    const profitChange = pct(profit, prevProfit);
    const roas_prev = prevAdSpend > 0 ? prevRevenue / prevAdSpend : 0;

    // Revenue trend
    if (revChange >= 20) {
      insights.push({
        id: "revenue-surge",
        severity: "positive",
        title: "Revenue surging",
        description: `Revenue is up ${revChange.toFixed(1)}% vs the previous period. Capitalise by increasing ad budget on your best-performing channels.`,
        metric: `+${revChange.toFixed(1)}%`,
        action: "Scale winning campaigns",
      });
    } else if (revChange <= -15) {
      insights.push({
        id: "revenue-drop",
        severity: "critical",
        title: "Revenue declining sharply",
        description: `Revenue dropped ${Math.abs(revChange).toFixed(1)}% vs the last period. Check for integration sync errors, inventory shortages, or ad budget cuts.`,
        metric: `${revChange.toFixed(1)}%`,
        action: "Audit integrations & ad spend",
      });
    } else if (revChange <= -5) {
      insights.push({
        id: "revenue-softening",
        severity: "warning",
        title: "Revenue softening",
        description: `Revenue is down ${Math.abs(revChange).toFixed(1)}%. Monitor closely and look at which platforms are underperforming.`,
        metric: `${revChange.toFixed(1)}%`,
      });
    }

    // Margin health
    if (margin < 10 && revenue > 0) {
      insights.push({
        id: "low-margin",
        severity: "critical",
        title: "Profit margin critically low",
        description: `Your margin is ${margin.toFixed(1)}%. At this level, small swings in ad spend or returns can push you into losses. Reduce ad waste or raise prices.`,
        metric: `${margin.toFixed(1)}% margin`,
        action: "Review COGS and ad spend",
      });
    } else if (margin < 20 && revenue > 0) {
      insights.push({
        id: "thin-margin",
        severity: "warning",
        title: "Margin below 20%",
        description: `Margin is ${margin.toFixed(1)}%. Industry benchmark for e-commerce is 20–30%. Look for overpriced shipping or underperforming ad channels.`,
        metric: `${margin.toFixed(1)}% margin`,
        action: "Optimise shipping & ads",
      });
    } else if (margin >= 35 && revenue > 0) {
      insights.push({
        id: "strong-margin",
        severity: "positive",
        title: "Healthy profit margin",
        description: `${margin.toFixed(1)}% margin — well above the 20% e-commerce benchmark. You have room to invest aggressively in growth.`,
        metric: `${margin.toFixed(1)}% margin`,
      });
    }

    // ROAS
    if (adSpend > 0) {
      if (roas < 1) {
        insights.push({
          id: "roas-negative",
          severity: "critical",
          title: "Ad spend exceeds ad revenue",
          description: `ROAS is ${roas.toFixed(2)}x — you're spending more on ads than they're generating. Pause worst-performing campaigns immediately.`,
          metric: `${roas.toFixed(2)}x ROAS`,
          action: "Pause underperforming campaigns",
        });
      } else if (roas < 2) {
        insights.push({
          id: "roas-low",
          severity: "warning",
          title: "ROAS below break-even",
          description: `ROAS of ${roas.toFixed(2)}x is below the typical 2–3x break-even point. Review targeting and creative on all active campaigns.`,
          metric: `${roas.toFixed(2)}x ROAS`,
          action: "Review ad targeting & creatives",
        });
      } else if (roas >= 5) {
        insights.push({
          id: "roas-excellent",
          severity: "positive",
          title: "Exceptional ROAS",
          description: `${roas.toFixed(2)}x ROAS is outstanding. Increase budget on these campaigns to capture more volume before competition catches up.`,
          metric: `${roas.toFixed(2)}x ROAS`,
          action: "Scale budget on top campaigns",
        });
      }

      // ROAS change
      const roasChange = pct(roas, roas_prev);
      if (roasChange <= -25 && roas_prev > 0) {
        insights.push({
          id: "roas-declining",
          severity: "warning",
          title: "ROAS declining fast",
          description: `ROAS dropped ${Math.abs(roasChange).toFixed(0)}% compared to the last period. Audience fatigue or increased competition may be the cause.`,
          metric: `${roasChange.toFixed(0)}% change`,
          action: "Refresh ad creatives",
        });
      }
    }

    // ── 2. Campaign-level analysis ─────────────────────────────────────────────
    const campaignMetrics = await db
      .select({
        campaignId: adMetricsTable.campaignId,
        name: adCampaignsTable.name,
        channel: adCampaignsTable.channel,
        totalSpend: sum(adMetricsTable.spend),
        totalRevenue: sum(adMetricsTable.revenue),
        totalConversions: sum(adMetricsTable.conversions),
        totalClicks: sum(adMetricsTable.clicks),
        totalImpressions: sum(adMetricsTable.impressions),
      })
      .from(adMetricsTable)
      .innerJoin(adCampaignsTable, eq(adMetricsTable.campaignId, adCampaignsTable.id))
      .where(
        and(
          eq(adMetricsTable.userId, userId),
          gte(adMetricsTable.date, win.from.toISOString().slice(0, 10)),
          lte(adMetricsTable.date, win.to.toISOString().slice(0, 10)),
        ),
      )
      .groupBy(adMetricsTable.campaignId, adCampaignsTable.name, adCampaignsTable.channel);

    if (campaignMetrics.length > 0) {
      const withRoas = campaignMetrics.map((c) => {
        const spend = Number(c.totalSpend ?? 0);
        const rev = Number(c.totalRevenue ?? 0);
        const clicks = Number(c.totalClicks ?? 0);
        const impr = Number(c.totalImpressions ?? 0);
        return {
          ...c,
          spend,
          rev,
          roas: spend > 0 ? rev / spend : 0,
          ctr: impr > 0 ? (clicks / impr) * 100 : 0,
        };
      });

      // Worst campaign
      const spending = withRoas.filter((c) => c.spend > 50);
      if (spending.length > 0) {
        const worst = spending.sort((a, b) => a.roas - b.roas)[0]!;
        if (worst.roas < 1.5) {
          insights.push({
            id: "worst-campaign",
            severity: "warning",
            title: `Underperforming campaign: ${worst.name}`,
            description: `"${worst.name}" (${worst.channel}) has a ${worst.roas.toFixed(2)}x ROAS on $${worst.spend.toFixed(0)} spend. Consider pausing or restructuring it.`,
            metric: `${worst.roas.toFixed(2)}x ROAS`,
            action: "Pause or restructure campaign",
          });
        }

        // Best campaign
        const best = spending.sort((a, b) => b.roas - a.roas)[0]!;
        if (best.roas >= 4) {
          insights.push({
            id: "best-campaign",
            severity: "positive",
            title: `Top campaign: ${best.name}`,
            description: `"${best.name}" (${best.channel}) is your best performer at ${best.roas.toFixed(2)}x ROAS. Increase its budget to maximise returns.`,
            metric: `${best.roas.toFixed(2)}x ROAS`,
            action: "Increase campaign budget",
          });
        }
      }
    }

    // ── 3. Product insights ────────────────────────────────────────────────────
    const lowStock = await db
      .select({ id: productsTable.id, name: productsTable.name, stock: productsTable.stock })
      .from(productsTable)
      .where(and(eq(productsTable.userId, userId), sql`${productsTable.stock} > 0 AND ${productsTable.stock} < 10`))
      .limit(5);

    if (lowStock.length > 0) {
      const names = lowStock.map((p) => p.name).join(", ");
      insights.push({
        id: "low-stock",
        severity: "warning",
        title: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low on stock`,
        description: `${names} — reorder soon to avoid lost sales.`,
        metric: `${lowStock.length} products`,
        action: "Reorder inventory",
        actionTarget: { screen: "products", entityId: lowStock[0]?.id, focus: "inventory" },
      });
    }

    const zeroStock = await db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable)
      .where(and(eq(productsTable.userId, userId), sql`${productsTable.stock} = 0`))
      .limit(3);

    if (zeroStock.length > 0) {
      const names = zeroStock.map((p) => p.name).slice(0, 3).join(", ");
      insights.push({
        id: "out-of-stock",
        severity: "critical",
        title: `${zeroStock.length} product${zeroStock.length > 1 ? "s" : ""} out of stock`,
        description: `${names}${zeroStock.length > 3 ? " and more" : ""} are out of stock. Every sale missed is revenue lost.`,
        metric: `${zeroStock.length} OOS`,
        action: "Restock immediately",
        actionTarget: { screen: "products", entityId: zeroStock[0]?.id, focus: "inventory" },
      });
    }

    // High COGS: surface the specific catalog item so the operator can fix the
    // cost input immediately instead of landing on a generic products view.
    const [highCogsProduct] = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        price: productsTable.price,
        cogs: productsTable.cogs,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.userId, userId),
          sql`${productsTable.price} > 0`,
          sql`${productsTable.cogs} / NULLIF(${productsTable.price}, 0) >= 0.6`,
        ),
      )
      .orderBy(sql`${productsTable.cogs} / NULLIF(${productsTable.price}, 0) DESC`)
      .limit(1);

    if (highCogsProduct) {
      const price = Number(highCogsProduct.price);
      const cogs = Number(highCogsProduct.cogs);
      const cogsPct = price > 0 ? (cogs / price) * 100 : 0;
      insights.push({
        id: "high-cogs-product",
        severity: cogsPct >= 75 ? "critical" : "warning",
        title: `COGS too high for ${highCogsProduct.name}`,
        description: `${highCogsProduct.name} costs ${cogsPct.toFixed(1)}% of its ${price.toFixed(2)} selling price before fees, shipping, or ads. Review supplier pricing or raise the price to protect margin.`,
        metric: `${cogsPct.toFixed(1)}% COGS`,
        action: "Review product costs",
        actionTarget: {
          screen: "products",
          entityId: highCogsProduct.id,
          focus: "costs",
        },
      });
    }

    // ── 4. Order velocity ──────────────────────────────────────────────────────
    const aovChange = ordersCount > 0 && prevOrders > 0 ? pct(aov, prevOrders > 0 ? prevRevenue / prevOrders : aov) : 0;
    if (aovChange >= 15) {
      insights.push({
        id: "aov-up",
        severity: "positive",
        title: "Average order value increasing",
        description: `AOV is up ${aovChange.toFixed(1)}% — customers are spending more per order. Your upsells or bundles are working.`,
        metric: `+${aovChange.toFixed(1)}% AOV`,
      });
    } else if (aovChange <= -15) {
      insights.push({
        id: "aov-down",
        severity: "warning",
        title: "Average order value declining",
        description: `AOV dropped ${Math.abs(aovChange).toFixed(1)}%. Consider upsell offers, bundles, or a free-shipping threshold to lift basket size.`,
        metric: `${aovChange.toFixed(1)}% AOV`,
        action: "Add upsell / bundle offers",
      });
    }

    // ── 5. General positive summary ────────────────────────────────────────────
    if (insights.length === 0 && revenue > 0) {
      insights.push({
        id: "all-good",
        severity: "positive",
        title: "Business looks healthy",
        description: `Revenue, margin, and ROAS are all within healthy ranges for the selected period. Keep monitoring and optimising.`,
        metric: `${margin.toFixed(1)}% margin`,
      });
    }

    if (insights.length === 0 && revenue === 0) {
      insights.push({
        id: "no-data",
        severity: "info",
        title: "No data yet for this period",
        description: "Connect a store or ad platform and trigger a sync to start seeing intelligence here.",
        action: "Connect an integration",
      });
    }

    // Sort: critical → warning → positive → info
    const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, positive: 2, info: 3 };
    insights.sort((a, b) => order[a.severity] - order[b.severity]);

    res.json(
      GetInsightsResponse.parse({
        insights: insights.slice(0, 8).map((insight) => ({
          ...insight,
          actionTarget: insight.actionTarget ?? targetForInsight(insight.id),
        })),
      }),
    );
  } catch (err) {
    res.status(500).json({ error: "Insights engine failed" });
  }
});

router.get("/insights/summary", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const range = parseRange(req.query.range);
  const win = dateWindow(range);
  const previous = {
    ...win,
    from: win.prevFrom,
    to: win.prevTo,
  };

  const [customer, currentStore, previousStore, currentTraffic, previousTraffic] =
    await Promise.all([
      CustomerService.insightsSummary(userId, win),
      Promise.all([
        RevenueService.getTotalRevenue(userId, win),
        RevenueService.getOrdersCount(userId, win),
      ]),
      Promise.all([
        RevenueService.getTotalRevenue(userId, previous),
        RevenueService.getOrdersCount(userId, previous),
      ]),
      MarketingService.summary(userId, win),
      MarketingService.summary(userId, previous),
    ]);

  const [performance, repeatCustomers] = await Promise.all([
    MarketingService.performanceHighlights(userId, win),
    CustomerService.repeatCustomers(userId, win),
  ]);

  const suggestions = [];
  const topAdSet = performance.adSets[0];
  if (topAdSet) {
    suggestions.push({
      id: "top-ad-set",
      severity: "positive",
      title: `${topAdSet.name} is your top ad set`,
      description: `${topAdSet.name} in ${topAdSet.parentName ?? "your campaigns"} generated ${topAdSet.roas.toFixed(2)}x ROAS from ${topAdSet.spend.toFixed(0)} spend, producing ${topAdSet.revenue.toFixed(0)} revenue across ${topAdSet.conversions} conversions. Its ${topAdSet.ctr.toFixed(2)}% CTR is a strong signal to protect the audience and test incremental budget increases.`,
      metric: `${topAdSet.roas.toFixed(2)}x ROAS`,
      action: "Review top ad set",
       actionTarget: { screen: "marketing", entityId: topAdSet.id, focus: "ad-set" },
    });
  }
  const topCreative = performance.creatives[0];
  if (topCreative) {
    suggestions.push({
      id: "top-creative",
      severity: "positive",
      title: `${topCreative.name} is your strongest creative`,
      description: `${topCreative.name} in ${topCreative.parentName ?? "your ad sets"} drove ${topCreative.conversions} conversions at ${topCreative.roas.toFixed(2)}x ROAS. Keep this creative live while testing new hooks, formats, or opening frames against its ${topCreative.ctr.toFixed(2)}% CTR benchmark.`,
      metric: `${topCreative.conversions} conversions`,
      action: "Compare creative variants",
       actionTarget: { screen: "marketing", entityId: topCreative.id, focus: "creative" },
    });
  }
  const topRepeatCustomer = repeatCustomers[0];
  if (topRepeatCustomer) {
    suggestions.push({
      id: "repeat-customer",
      severity: "info",
      title: `${topRepeatCustomer.name} is buying repeatedly`,
      description: `${topRepeatCustomer.name} placed ${topRepeatCustomer.ordersCount} orders in this period and spent ${topRepeatCustomer.totalSpent.toFixed(0)} total, with an average order value of ${topRepeatCustomer.averageOrderValue.toFixed(0)}. Consider a VIP offer, replenishment reminder, or referral request.`,
      metric: `${topRepeatCustomer.ordersCount} orders`,
      action: "View customer orders",
       actionTarget: { screen: "reports", section: "customers", entityId: topRepeatCustomer.id },
    });
  }

  const [revenue, orders] = currentStore;
  const [previousRevenue, previousOrders] = previousStore;
  const averageOrderValue = orders > 0 ? revenue / orders : 0;
  const previousAverageOrderValue = previousOrders > 0 ? previousRevenue / previousOrders : 0;
  const margin = revenue > 0
    ? ((revenue - currentTraffic.adSpend) / revenue) * 100
    : 0;

  res.json(
    GetInsightsSummaryResponse.parse({
      customer,
      store: {
        revenue: { value: revenue, deltaPct: pct(revenue, previousRevenue) },
        orders: { value: orders, deltaPct: pct(orders, previousOrders) },
        averageOrderValue: {
          value: averageOrderValue,
          deltaPct: pct(averageOrderValue, previousAverageOrderValue),
        },
        margin,
      },
      traffic: {
        impressions: {
          value: currentTraffic.impressions,
          deltaPct: pct(currentTraffic.impressions, previousTraffic.impressions),
        },
        clicks: {
          value: currentTraffic.clicks,
          deltaPct: pct(currentTraffic.clicks, previousTraffic.clicks),
        },
        ctr: {
          value: currentTraffic.ctr,
          deltaPct: pct(currentTraffic.ctr, previousTraffic.ctr),
        },
        conversions: {
          value: currentTraffic.conversions,
          deltaPct: pct(currentTraffic.conversions, previousTraffic.conversions),
        },
      },
      highlights: {
        adSets: performance.adSets,
        creatives: performance.creatives,
        repeatCustomers,
        suggestions,
      },
    }),
  );
});

export default router;
