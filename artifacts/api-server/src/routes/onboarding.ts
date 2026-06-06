import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/onboarding/status", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [user] = await db
    .select({ isOnboarded: usersTable.isOnboarded })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  res.json({ onboarded: user?.isOnboarded === "true" });
});

router.post("/onboarding/complete", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  await db
    .update(usersTable)
    .set({ isOnboarded: "true" })
    .where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;
