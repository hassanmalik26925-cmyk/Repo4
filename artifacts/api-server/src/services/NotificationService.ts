import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

export const NotificationService = {
  async create(opts: {
    userId: string;
    type: string;
    title: string;
    description?: string;
  }) {
    return db.insert(notificationsTable).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      description: opts.description ?? null,
    });
  },

  async list(userId: string, limit = 50) {
    return db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);
  },

  async markRead(userId: string, ids: string[]) {
    for (const id of ids) {
      await db
        .update(notificationsTable)
        .set({ read: true })
        .where(
          and(
            eq(notificationsTable.id, id),
            eq(notificationsTable.userId, userId),
          ),
        );
    }
  },

  async markAllRead(userId: string) {
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.userId, userId));
  },

  async countUnread(userId: string) {
    const rows = await db
      .select({ count: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.read, false),
        ),
      );
    return rows.length;
  },
};
