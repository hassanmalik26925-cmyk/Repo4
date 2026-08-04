import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, shippingRatesTable } from "@workspace/db";
import {
  ListShippingRatesResponse,
  ListShippingRatesResponseItem,
  CreateShippingRateBody,
  UpdateShippingRateBody,
  UpdateShippingRateResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ActivityService } from "../services/ActivityService";

const router: IRouter = Router();
router.use(requireAuth);

function shape(row: typeof shippingRatesTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    minOrderValue: Number(row.minOrderValue),
    maxOrderValue: row.maxOrderValue === null ? null : Number(row.maxOrderValue),
    rate: Number(row.rate),
    active: row.active,
  };
}

function validateValues(
  minOrderValue: number,
  maxOrderValue: number | null,
  rate: number,
): string | null {
  if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
    return "Minimum order value must be a nonnegative number";
  }
  if (
    maxOrderValue !== null &&
    (!Number.isFinite(maxOrderValue) || maxOrderValue < 0)
  ) {
    return "Maximum order value must be null or a nonnegative number";
  }
  if (maxOrderValue !== null && maxOrderValue < minOrderValue) {
    return "Maximum order value must be at least the minimum";
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return "Shipping rate must be a nonnegative number";
  }
  return null;
}

router.get("/shipping-rates", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db
    .select()
    .from(shippingRatesTable)
    .where(eq(shippingRatesTable.userId, userId))
    .orderBy(shippingRatesTable.minOrderValue);
  res.json(ListShippingRatesResponse.parse(rows.map(shape)));
});

router.post("/shipping-rates", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const parsed = CreateShippingRateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const minOrderValue = parsed.data.minOrderValue ?? 0;
  const maxOrderValue = parsed.data.maxOrderValue ?? null;
  const rateError = validateValues(minOrderValue, maxOrderValue, parsed.data.rate);
  if (rateError) {
    res.status(400).json({ error: rateError });
    return;
  }
  const [row] = await db
    .insert(shippingRatesTable)
    .values({
      userId,
      name: parsed.data.name,
      region: parsed.data.region ?? "All regions",
      minOrderValue: String(minOrderValue),
      maxOrderValue:
        maxOrderValue === null ? null : String(maxOrderValue),
      rate: String(parsed.data.rate),
      active: parsed.data.active ?? true,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to create shipping rate" });
    return;
  }
  await ActivityService.log({
    userId,
    type: "shipping_rate.created",
    title: `Shipping rate "${row.name}" added`,
    entityType: "shipping_rate",
    entityId: row.id,
  });
  res.status(201).json(ListShippingRatesResponseItem.parse(shape(row)));
});

router.patch("/shipping-rates/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const parsed = UpdateShippingRateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(shippingRatesTable)
    .where(and(eq(shippingRatesTable.id, id), eq(shippingRatesTable.userId, userId)));
  if (!existing) {
    res.status(404).json({ error: "Shipping rate not found" });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "At least one shipping-rate field is required" });
    return;
  }
  const minOrderValue =
    parsed.data.minOrderValue !== undefined
      ? parsed.data.minOrderValue
      : Number(existing.minOrderValue);
  const maxOrderValue =
    parsed.data.maxOrderValue !== undefined
      ? parsed.data.maxOrderValue
      : existing.maxOrderValue === null
        ? null
        : Number(existing.maxOrderValue);
  const rate =
    parsed.data.rate !== undefined ? parsed.data.rate : Number(existing.rate);
  const rateError = validateValues(minOrderValue, maxOrderValue, rate);
  if (rateError) {
    res.status(400).json({ error: rateError });
    return;
  }
  const update: Partial<typeof shippingRatesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.region !== undefined) update.region = parsed.data.region;
  if (parsed.data.minOrderValue !== undefined)
    update.minOrderValue = String(parsed.data.minOrderValue);
  if (parsed.data.maxOrderValue !== undefined)
    update.maxOrderValue =
      parsed.data.maxOrderValue == null ? null : String(parsed.data.maxOrderValue);
  if (parsed.data.rate !== undefined) update.rate = String(parsed.data.rate);
  if (parsed.data.active !== undefined) update.active = parsed.data.active;

  const [row] = await db
    .update(shippingRatesTable)
    .set(update)
    .where(and(eq(shippingRatesTable.id, id), eq(shippingRatesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Shipping rate not found" });
    return;
  }
  res.json(UpdateShippingRateResponse.parse(shape(row)));
});

router.delete("/shipping-rates/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const [row] = await db
    .delete(shippingRatesTable)
    .where(and(eq(shippingRatesTable.id, id), eq(shippingRatesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Shipping rate not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
