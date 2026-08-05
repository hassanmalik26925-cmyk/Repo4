import { Router, type IRouter } from "express";
import { ListCustomersResponse } from "@workspace/api-zod";
import { GetCustomerDetailResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { CustomerService } from "../services/CustomerService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/customers", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await CustomerService.list(userId);
  res.json(ListCustomersResponse.parse(rows));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const detail = await CustomerService.detail(userId, id);
  if (!detail) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(GetCustomerDetailResponse.parse(detail));
});

export default router;
