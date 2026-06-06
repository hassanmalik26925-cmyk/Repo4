import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const auditLogsTable = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id"),
  action: text("action").notNull(), // login, logout, password_reset, settings_change, data_export, etc
  resource: text("resource"), // e.g., "user", "settings", "order"
  resourceId: text("resource_id"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
