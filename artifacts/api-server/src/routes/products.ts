import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsResponse,
  ListProductsResponseItem,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePaidAccess } from "../middlewares/requirePaidAccess";
import { dateWindow, parseRange } from "../lib/dateRange";
import { ProductService } from "../services/ProductService";
import { ActivityService } from "../services/ActivityService";

const router: IRouter = Router();
router.use(requireAuth);
router.use("/products", requirePaidAccess);

router.get("/products", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const win = dateWindow(parseRange(req.query.range));
  const rows = await ProductService.list(userId, win);
  res.json(ListProductsResponse.parse(rows));
});

router.post("/products", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(productsTable)
    .values({
      userId,
      platform: "manual",
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      category: parsed.data.category ?? "Uncategorized",
      price: String(parsed.data.price),
      cogs: String(parsed.data.cogs ?? 0),
      stock: parsed.data.stock ?? 0,
      lowStockThreshold: parsed.data.lowStockThreshold ?? 10,
      status: "active",
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to create product" });
    return;
  }
  await ActivityService.log({
    userId,
    type: "product.created",
    title: `${row.name} added manually`,
    entityType: "product",
    entityId: row.id,
  });
  res.status(201).json(
    ListProductsResponseItem.parse({
      id: row.id,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      cogs: Number(row.cogs),
      stock: row.stock,
      status: row.status,
      lowStock: row.stock <= row.lowStockThreshold,
      unitsSold: 0,
      revenue: 0,
      profit: 0,
      margin: 0,
      roas: 0,
    }),
  );
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Partial<typeof productsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.price !== undefined) update.price = String(parsed.data.price);
  if (parsed.data.cogs !== undefined) update.cogs = String(parsed.data.cogs);
  if (parsed.data.stock !== undefined) update.stock = parsed.data.stock;
  if (parsed.data.lowStockThreshold !== undefined)
    update.lowStockThreshold = parsed.data.lowStockThreshold;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;

  const [row] = await db
    .update(productsTable)
    .set(update)
    .where(and(eq(productsTable.id, id), eq(productsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await ActivityService.log({
    userId,
    type: "product.updated",
    title: `${row.name} updated`,
    entityType: "product",
    entityId: row.id,
  });
  const performance = await ProductService.getOne(userId, row.id);
  res.json(UpdateProductResponse.parse(performance));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const [row] = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
