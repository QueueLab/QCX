'use server'

import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function enqueueJob(userId: string, type: string, payload: any) {
  try {
    const result = await db.insert(jobs).values({
      userId,
      type,
      payload,
      status: 'pending',
    }).returning({ id: jobs.id })

    return result[0].id
  } catch (error) {
    console.error('Error enqueuing job:', error)
    throw error
  }
}

export async function getJob(jobId: string) {
  try {
    const result = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1)
    return result[0] || null
  } catch (error) {
    console.error('Error getting job:', error)
    return null
  }
}

export async function updateJob(jobId: string, updates: Partial<typeof jobs.$inferInsert>) {
  try {
    await db.update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
  } catch (error) {
    console.error('Error updating job:', error)
    throw error
  }
}

export async function getJobStatus(jobId: string) {
  'use server'
  const job = await getJob(jobId)
  if (!job) return { status: 'not_found' }
  return {
    status: job.status,
    result: job.result,
    error: job.error
  }
}
