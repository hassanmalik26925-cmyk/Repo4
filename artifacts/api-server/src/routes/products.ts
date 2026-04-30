import { Router, type IRouter } from "express";
import { ListProductsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { dateWindow, parseRange } from "../lib/dateRange";
import { ProductService } from "../services/ProductService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/products", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  const rows = await ProductService.list(userId, win);
  res.json(ListProductsResponse.parse(rows));
});

export default router;
