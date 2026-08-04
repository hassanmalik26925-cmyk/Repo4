import { Router, type IRouter } from "express";
import { ListCustomersResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { CustomerService } from "../services/CustomerService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/customers", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await CustomerService.list(userId);
  res.json(ListCustomersResponse.parse(rows));
});

export default router;
