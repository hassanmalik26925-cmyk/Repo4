import { Router, type IRouter } from "express";
import { ListCustomersResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePaidAccess } from "../middlewares/requirePaidAccess";
import { CustomerService } from "../services/CustomerService";

const router: IRouter = Router();
router.use(requireAuth);
router.use(requirePaidAccess);

router.get("/customers", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await CustomerService.list(userId);
  res.json(ListCustomersResponse.parse(rows));
});

export default router;
