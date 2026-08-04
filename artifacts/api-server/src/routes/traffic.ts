import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, trafficEventsTable } from "@workspace/db";
import { CreateTrafficEventBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();
router.use(requireAuth);

router.post(
  "/traffic/events",
  rateLimit({ windowMs: 60_000, max: 120 }),
  async (req, res): Promise<void> => {
    const parsed = CreateTrafficEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [event] = await db
      .insert(trafficEventsTable)
      .values({
        userId: req.user!.sub,
        eventName: parsed.data.eventName,
        sessionId: parsed.data.sessionId ?? null,
        pagePath: parsed.data.pagePath ?? null,
        source: parsed.data.source ?? null,
        medium: parsed.data.medium ?? null,
        campaign: parsed.data.campaign ?? null,
        value: parsed.data.value ?? null,
        metadata: parsed.data.metadata ?? null,
        occurredAt: parsed.data.occurredAt ?? new Date(),
      })
      .returning();
    res.status(201).json({
      id: event!.id,
      eventName: event!.eventName,
      occurredAt: event!.occurredAt.toISOString(),
    });
  },
);

router.get("/traffic/events", async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
  const events = await db
    .select({
      id: trafficEventsTable.id,
      eventName: trafficEventsTable.eventName,
      sessionId: trafficEventsTable.sessionId,
      pagePath: trafficEventsTable.pagePath,
      source: trafficEventsTable.source,
      medium: trafficEventsTable.medium,
      campaign: trafficEventsTable.campaign,
      value: trafficEventsTable.value,
      metadata: trafficEventsTable.metadata,
      occurredAt: trafficEventsTable.occurredAt,
    })
    .from(trafficEventsTable)
    .where(eq(trafficEventsTable.userId, req.user!.sub))
    .limit(limit);
  res.json({ events: events.map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString() })) });
});

export default router;