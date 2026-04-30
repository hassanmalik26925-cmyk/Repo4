import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const productsTable = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull().default("manual"),
    externalId: text("external_id"),
    name: text("name").notNull(),
    sku: text("sku"),
    category: text("category").notNull().default("Uncategorized"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    cogs: numeric("cogs", { precision: 12, scale: 2 }).notNull().default("0"),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqExternal: uniqueIndex("products_user_platform_external_idx").on(
      t.userId,
      t.platform,
      t.externalId,
    ),
  }),
);

export type Product = typeof productsTable.$inferSelect;
