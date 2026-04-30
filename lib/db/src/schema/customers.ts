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

export const customersTable = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    totalSpent: numeric("total_spent", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    ordersCount: integer("orders_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqExternal: uniqueIndex("customers_user_platform_external_idx").on(
      t.userId,
      t.platform,
      t.externalId,
    ),
  }),
);

export type Customer = typeof customersTable.$inferSelect;
