import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import ordersRouter from "./orders";
import productsRouter from "./products";
import customersRouter from "./customers";
import marketingRouter from "./marketing";
import integrationsRouter from "./integrations";
import settingsRouter from "./settings";
import activitiesRouter from "./activities";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(ordersRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(marketingRouter);
router.use(integrationsRouter);
router.use(settingsRouter);
router.use(activitiesRouter);
router.use(insightsRouter);

export default router;
