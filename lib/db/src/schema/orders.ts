import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const ordersTable = pgTable(
  "orders",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    orderNumber: text("order_number").notNull(),
    customerId: text("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
    }),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    shipping: numeric("shipping", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    tax: numeric("tax", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    status: text("status").notNull(),
    orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqExternal: uniqueIndex("orders_user_platform_external_idx").on(
      t.userId,
      t.platform,
      t.externalId,
    ),
    orderedAtIdx: index("orders_ordered_at_idx").on(t.userId, t.orderedAt),
    statusIdx: index("orders_status_idx").on(t.userId, t.status),
  }),
);

export const orderItemsTable = pgTable("order_items", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
