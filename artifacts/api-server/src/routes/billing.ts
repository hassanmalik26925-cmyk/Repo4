import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  cancelSubscription,
  createCheckout,
  getBillingStatus,
} from "../services/BillingService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/billing/status", async (req, res): Promise<void> => {
  try {
    res.json(await getBillingStatus(req.user!.sub));
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Billing is unavailable",
    });
  }
});

router.post("/billing/checkout", async (req, res): Promise<void> => {
  try {
    const requestedRedirect =
      typeof req.body?.redirectUrl === "string" ? req.body.redirectUrl : "";
    const requestOrigin =
      req.get("origin") ?? `${req.protocol}://${req.get("host")}`;
    let redirectUrl = `${requestOrigin}/`;
    if (requestedRedirect) {
      const parsed = new URL(requestedRedirect);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        res.status(400).json({ error: "Invalid checkout return URL." });
        return;
      }
      if (parsed.origin !== requestOrigin) {
        res.status(400).json({ error: "Checkout return URL must use this app origin." });
        return;
      }
      redirectUrl = parsed.toString();
    }
    const result = await createCheckout(
      req.user!.sub,
      redirectUrl,
    );
    if (!result.purchase_url) {
      res.status(502).json({ error: "Whop did not return a checkout URL." });
      return;
    }
    res.json({ purchaseUrl: result.purchase_url });
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Unable to start checkout",
    });
  }
});

router.post("/billing/cancel", async (req, res): Promise<void> => {
  try {
    res.json(await cancelSubscription(req.user!.sub));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unable to cancel subscription",
    });
  }
});

export default router;