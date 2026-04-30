import { Router, type IRouter } from "express";
import { ListActivitiesResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ActivityService } from "../services/ActivityService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/activities", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const limitRaw = req.query.limit;
  const limit = typeof limitRaw === "string" ? parseInt(limitRaw, 10) : 20;
  const rows = await ActivityService.list(
    userId,
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 20,
  );
  res.json(ListActivitiesResponse.parse(rows));
});

export default router;
