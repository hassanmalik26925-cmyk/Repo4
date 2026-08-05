import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const authIdentitiesTable = pgTable(
  "auth_identities",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    providerAccountIdx: uniqueIndex("auth_identities_provider_account_idx").on(
      t.provider,
      t.providerAccountId,
    ),
    userProviderIdx: uniqueIndex("auth_identities_user_provider_idx").on(
      t.userId,
      t.provider,
    ),
  }),
);

export type AuthIdentity = typeof authIdentitiesTable.$inferSelect;