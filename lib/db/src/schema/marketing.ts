import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const adCampaignsTable = pgTable(
  "ad_campaigns",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
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
    uniqExternal: uniqueIndex("ad_campaigns_user_channel_external_idx").on(
      t.userId,
      t.channel,
      t.externalId,
    ),
  }),
);

export const adMetricsTable = pgTable(
  "ad_metrics",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => adCampaignsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    spend: numeric("spend", { precision: 14, scale: 2 }).notNull().default("0"),
    revenue: numeric("revenue", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
  },
  (t) => ({
    uniqCampaignDate: uniqueIndex("ad_metrics_campaign_date_idx").on(
      t.campaignId,
      t.date,
    ),
    userDateIdx: index("ad_metrics_user_date_idx").on(t.userId, t.date),
  }),
);

export type AdCampaign = typeof adCampaignsTable.$inferSelect;
export type AdMetric = typeof adMetricsTable.$inferSelect;
