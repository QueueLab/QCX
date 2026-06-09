'use server'

import { getJobStatus as getJobStatusServer } from './jobs'

export async function getJobStatus(jobId: string) {
  return await getJobStatusServer(jobId)
}
