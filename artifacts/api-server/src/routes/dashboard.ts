import { Router, type IRouter } from "express";
import {
  GetDashboardOverviewResponse,
  GetRevenueTrendResponse,
  GetRevenueByPlatformResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePaidAccess } from "../middlewares/requirePaidAccess";
import { dateWindow, parseRange, pctChange } from "../lib/dateRange";
import { RevenueService } from "../services/RevenueService";

const router: IRouter = Router();
router.use(requireAuth);
router.use("/dashboard", requirePaidAccess);

router.get("/dashboard/overview", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const range = parseRange(req.query.range);
  const win = dateWindow(range);
  const prev = {
    range,
    days: win.days,
    from: win.prevFrom,
    to: win.prevTo,
    prevFrom: win.prevFrom,
    prevTo: win.prevTo,
  };

  const [revenue, adSpend, ordersCount, prevRevenue, prevAdSpend, prevOrders] =
    await Promise.all([
      RevenueService.getTotalRevenue(userId, win),
      RevenueService.getTotalAdSpend(userId, win),
      RevenueService.getOrdersCount(userId, win),
      RevenueService.getTotalRevenue(userId, prev),
      RevenueService.getTotalAdSpend(userId, prev),
      RevenueService.getOrdersCount(userId, prev),
    ]);

  const profit = revenue - adSpend;
  const prevProfit = prevRevenue - prevAdSpend;
  const aov = ordersCount > 0 ? revenue / ordersCount : 0;
  const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;
  const prevRoas = prevAdSpend > 0 ? prevRevenue / prevAdSpend : 0;
  const cpa = ordersCount > 0 ? adSpend / ordersCount : 0;
  const prevCpa = prevOrders > 0 ? prevAdSpend / prevOrders : 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  res.json(
    GetDashboardOverviewResponse.parse({
      range,
      revenue: { value: revenue, deltaPct: pctChange(revenue, prevRevenue) },
      adSpend: { value: adSpend, deltaPct: pctChange(adSpend, prevAdSpend) },
      profit: { value: profit, deltaPct: pctChange(profit, prevProfit) },
      ordersCount: {
        value: ordersCount,
        deltaPct: pctChange(ordersCount, prevOrders),
      },
      avgOrderValue: { value: aov, deltaPct: pctChange(aov, prevAov) },
      roas: { value: roas, deltaPct: pctChange(roas, prevRoas) },
      cpa: { value: cpa, deltaPct: pctChange(cpa, prevCpa) },
      margin,
    }),
  );
});

router.get("/dashboard/revenue-trend", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  const points = await RevenueService.getRevenueByDay(userId, win);
  res.json(GetRevenueTrendResponse.parse(points));
});

router.get("/dashboard/revenue-by-platform", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  const rows = await RevenueService.getRevenueByPlatform(userId, win);
  res.json(GetRevenueByPlatformResponse.parse(rows));
});

export default router;
