import { Router, type IRouter } from "express";
import { getWhopClient } from "../lib/whopClient";
import { logger } from "../lib/logger";
import { reconcileBillingWebhook } from "../services/BillingService";

const router: IRouter = Router();

function stringHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).flatMap(([name, value]) => {
      if (typeof value === "string") return [[name, value]];
      if (Array.isArray(value)) return [[name, value.join(", ")]];
      return [];
    }),
  );
}

/**
 * Public Whop webhook endpoint. Authentication is the Standard Webhooks
 * signature, verified before the event is inspected or acted on.
 */
router.post("/webhooks/whop", async (req, res): Promise<void> => {
  if (!process.env.WHOP_WEBHOOK_SECRET) {
    res.status(503).json({ error: "Whop webhook secret is not configured." });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
      ? req.body
      : "";
  if (!rawBody) {
    res.status(400).json({ error: "Webhook body is required." });
    return;
  }

  try {
    const client = await getWhopClient();
    const event = client.webhooks.unwrap(rawBody, {
      headers: stringHeaders(req.headers),
    });
    await reconcileBillingWebhook(event);
    res.sendStatus(204);
  } catch (error) {
    logger.warn({ err: error }, "Rejected Whop webhook");
    res.status(400).json({ error: "Invalid Whop webhook." });
  }
});

export default router;