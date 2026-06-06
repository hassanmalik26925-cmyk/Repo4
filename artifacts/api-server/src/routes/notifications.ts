import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { NotificationService } from "../services/NotificationService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/notifications", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const items = await NotificationService.list(userId, limit);
  const unread = await NotificationService.countUnread(userId);
  res.json({ items, unreadCount: unread });
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  await NotificationService.markRead(userId, [req.params.id]);
  res.json({ success: true });
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  await NotificationService.markAllRead(userId);
  res.json({ success: true });
});

export default router;
