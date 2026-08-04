import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const trafficEventsTable = pgTable(
  "traffic_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    sessionId: text("session_id"),
    pagePath: text("page_path"),
    source: text("source"),
    medium: text("medium"),
    campaign: text("campaign"),
    value: integer("value"),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userOccurredIdx: index("traffic_events_user_occurred_idx").on(
      t.userId,
      t.occurredAt,
    ),
  }),
);

export type TrafficEvent = typeof trafficEventsTable.$inferSelect;