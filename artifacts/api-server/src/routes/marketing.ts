import { Router, type IRouter } from "express";
import {
  GetMarketingSummaryResponse,
  ListCampaignsResponse,
  GetMarketingByChannelResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePaidAccess } from "../middlewares/requirePaidAccess";
import { dateWindow, parseRange } from "../lib/dateRange";
import { MarketingService } from "../services/MarketingService";

const router: IRouter = Router();
router.use(requireAuth);
router.use("/marketing", requirePaidAccess);

router.get("/marketing/summary", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  res.json(GetMarketingSummaryResponse.parse(await MarketingService.summary(userId, win)));
});

router.get("/marketing/campaigns", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  res.json(ListCampaignsResponse.parse(await MarketingService.campaigns(userId, win)));
});

router.get("/marketing/by-channel", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  res.json(GetMarketingByChannelResponse.parse(await MarketingService.byChannel(userId, win)));
});

export default router;
