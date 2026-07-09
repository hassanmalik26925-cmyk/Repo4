import {
  pgTable,
  text,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const shippingRatesTable = pgTable("shipping_rates", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  region: text("region").notNull().default("All regions"),
  minOrderValue: numeric("min_order_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  maxOrderValue: numeric("max_order_value", { precision: 12, scale: 2 }),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ShippingRate = typeof shippingRatesTable.$inferSelect;
