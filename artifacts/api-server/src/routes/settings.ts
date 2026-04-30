import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);

function shape(user: typeof usersTable.$inferSelect) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    notificationsEnabled: user.notificationsEnabled === "true",
    dataRefreshMinutes: Number(user.dataRefreshMinutes),
    defaultRange: user.defaultRange,
    currency: user.currency,
  };
}

router.get("/settings", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetSettingsResponse.parse(shape(user)));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.notificationsEnabled !== undefined)
    update.notificationsEnabled = String(parsed.data.notificationsEnabled);
  if (parsed.data.dataRefreshMinutes !== undefined)
    update.dataRefreshMinutes = String(parsed.data.dataRefreshMinutes);
  if (parsed.data.defaultRange !== undefined)
    update.defaultRange = parsed.data.defaultRange;
  if (parsed.data.currency !== undefined) update.currency = parsed.data.currency;
  const [user] = await db
    .update(usersTable)
    .set(update)
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateSettingsResponse.parse(shape(user)));
});

export default router;
