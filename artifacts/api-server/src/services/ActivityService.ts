import { desc, eq } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";

export interface ActivityRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export class ActivityService {
  static async log(input: {
    userId: string;
    type: string;
    title: string;
    description?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
    tx?: typeof db;
  }): Promise<void> {
    const target = input.tx ?? db;
    await target.insert(activitiesTable).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
  }

  static async list(userId: string, limit = 20): Promise<ActivityRow[]> {
    const rows = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.userId, userId))
      .orderBy(desc(activitiesTable.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
