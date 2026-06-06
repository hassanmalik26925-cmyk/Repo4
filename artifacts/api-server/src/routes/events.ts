import { Router, type IRouter, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const clients = new Map<string, Set<Response>>();

const router: IRouter = Router();
router.use(requireAuth);

router.get("/events/subscribe", (req, res): void => {
  const userId = req.user!.sub;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.write("event: connected\ndata: {}\n\n");

  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);

  const heartbeat = setInterval(() => {
    res.write("event: heartbeat\ndata: {}\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.get(userId)?.delete(res);
  });
});

export function broadcastToUser(userId: string, event: string, data: unknown): void {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of userClients) {
    try { client.write(msg); } catch {}
  }
}

export default router;
