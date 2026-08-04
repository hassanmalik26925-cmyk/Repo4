import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("manager"),
  notificationsEnabled: text("notifications_enabled").notNull().default("true"),
  dataRefreshMinutes: text("data_refresh_minutes").notNull().default("15"),
  defaultRange: text("default_range").notNull().default("30d"),
  currency: text("currency").notNull().default("USD"),
  isOnboarded: text("is_onboarded").notNull().default("false"),
  isDemo: text("is_demo").notNull().default("false"),
  billingStatus: text("billing_status").notNull().default("inactive"),
  whopMembershipId: text("whop_membership_id"),
  billingManageUrl: text("billing_manage_url"),
  billingRenewalEnd: timestamp("billing_renewal_end", { withTimezone: true }),
  billingCancelAtPeriodEnd: text("billing_cancel_at_period_end")
    .notNull()
    .default("false"),
  billingLastCheckedAt: timestamp("billing_last_checked_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
