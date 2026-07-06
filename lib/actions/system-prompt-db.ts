import { db } from '@/lib/db';
import { nanoid } from '@/lib/utils';
import { promptGenerationJobs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type PromptGenerationJob = typeof promptGenerationJobs.$inferSelect;
export type NewPromptGenerationJob = typeof promptGenerationJobs.$inferInsert;

/**
 * Creates a new prompt generation job.
 */
export async function createJob(data: NewPromptGenerationJob): Promise<PromptGenerationJob> {
  const result = await db.insert(promptGenerationJobs).values({ ...data, id: data.id || nanoid() }).returning();
  if (!result[0]) {
    throw new Error('Failed to create prompt generation job');
  }
  return result[0];
}

/**
 * Updates an existing prompt generation job.
 * Automatically advances updatedAt to serve as a heartbeat.
 */
export async function updateJob(
  id: string,
  userId: string,
  data: Partial<Omit<NewPromptGenerationJob, 'id' | 'userId' | 'createdAt'>>
): Promise<PromptGenerationJob | null> {
  const result = await db
    .update(promptGenerationJobs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(promptGenerationJobs.id, id), eq(promptGenerationJobs.userId, userId)))
    .returning();

  return result[0] || null;
}

/**
 * Fetches a job by ID and userId.
 */
export async function getJobByIdAndUserId(id: string, userId: string): Promise<PromptGenerationJob | null> {
  const result = await db
    .select()
    .from(promptGenerationJobs)
    .where(and(eq(promptGenerationJobs.id, id), eq(promptGenerationJobs.userId, userId)))
    .limit(1);

  return result[0] || null;
}
