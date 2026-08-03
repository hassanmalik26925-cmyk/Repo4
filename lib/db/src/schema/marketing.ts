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

export const adSetsTable = pgTable(
  "ad_sets",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => adCampaignsTable.id, { onDelete: "cascade" }),
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
    uniqExternal: uniqueIndex("ad_sets_user_channel_external_idx").on(
      t.userId,
      t.channel,
      t.externalId,
    ),
    campaignIdx: index("ad_sets_campaign_idx").on(t.campaignId),
  }),
);

export const adSetMetricsTable = pgTable(
  "ad_set_metrics",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adSetId: text("ad_set_id")
      .notNull()
      .references(() => adSetsTable.id, { onDelete: "cascade" }),
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
    uniqAdSetDate: uniqueIndex("ad_set_metrics_ad_set_date_idx").on(t.adSetId, t.date),
    userDateIdx: index("ad_set_metrics_user_date_idx").on(t.userId, t.date),
  }),
);

export const adCreativesTable = pgTable(
  "ad_creatives",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    adSetId: text("ad_set_id")
      .notNull()
      .references(() => adSetsTable.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => adCampaignsTable.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    format: text("format").notNull().default("unknown"),
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
    uniqExternal: uniqueIndex("ad_creatives_user_channel_external_idx").on(
      t.userId,
      t.channel,
      t.externalId,
    ),
    adSetIdx: index("ad_creatives_ad_set_idx").on(t.adSetId),
  }),
);

export const creativeMetricsTable = pgTable(
  "creative_metrics",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    creativeId: text("creative_id")
      .notNull()
      .references(() => adCreativesTable.id, { onDelete: "cascade" }),
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
    uniqCreativeDate: uniqueIndex("creative_metrics_creative_date_idx").on(t.creativeId, t.date),
    userDateIdx: index("creative_metrics_user_date_idx").on(t.userId, t.date),
  }),
);

export type AdCampaign = typeof adCampaignsTable.$inferSelect;
export type AdMetric = typeof adMetricsTable.$inferSelect;
export type AdSet = typeof adSetsTable.$inferSelect;
export type AdSetMetric = typeof adSetMetricsTable.$inferSelect;
export type AdCreative = typeof adCreativesTable.$inferSelect;
export type CreativeMetric = typeof creativeMetricsTable.$inferSelect;
