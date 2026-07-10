import { Router, type IRouter } from "express";
import {
  ListOrdersResponse,
  GetOrderResponse,
  FulfillOrderResponse,
  SendOrderReceiptResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { dateWindow, parseRange } from "../lib/dateRange";
import { OrderService } from "../services/OrderService";
import { ActivityService } from "../services/ActivityService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/orders", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const [orders, summary] = await Promise.all([
    OrderService.list(userId, win, { status, platform, search }),
    OrderService.summary(userId, win),
  ]);
  res.json(ListOrdersResponse.parse({ orders, summary }));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const detail = await OrderService.getDetail(userId, id);
  if (!detail) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(
    GetOrderResponse.parse({
      order: {
        id: detail.order.id,
        orderNumber: detail.order.orderNumber,
        platform: detail.order.platform,
        status: detail.order.status,
        totalAmount: detail.order.totalAmount,
        subtotal: detail.order.subtotal,
        shipping: detail.order.shipping,
        tax: detail.order.tax,
        profit: detail.order.profit,
        orderedAt: detail.order.orderedAt.toISOString(),
      },
      items: detail.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
        lineTotal: i.lineTotal,
      })),
      customer: detail.customer,
    }),
  );
});

router.post("/orders/:id/fulfill", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const updated = await OrderService.markFulfilled(userId, id);
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  await ActivityService.log({
    userId,
    type: "order.fulfilled",
    title: `Order ${updated.orderNumber} fulfilled`,
    entityType: "order",
    entityId: updated.id,
  });
  OrderService.sendPendingReceipts(userId).catch((err) =>
    req.log.error({ err }, "Receipt send failed after fulfill"),
  );
  res.json(
    FulfillOrderResponse.parse({
      id: updated.id,
      orderNumber: updated.orderNumber,
      platform: updated.platform,
      status: updated.status,
      totalAmount: Number(updated.totalAmount),
      orderedAt: updated.orderedAt.toISOString(),
    }),
  );
});

router.post("/orders/:id/send-receipt", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const result = await OrderService.sendReceiptNow(userId, id);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (result.sent) {
    await ActivityService.log({
      userId,
      type: "receipt.sent",
      title: `Receipt emailed to ${result.recipientEmail}`,
      entityType: "order",
      entityId: id,
    });
  }
  res.json(
    SendOrderReceiptResponse.parse({
      sent: result.sent,
      orderId: id,
      recipientEmail: result.recipientEmail,
      reason: result.reason,
    }),
  );
});

export default router;
