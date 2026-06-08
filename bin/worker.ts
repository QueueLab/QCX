import { db } from '../lib/db'
import { jobs } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateReportContext } from '../lib/actions/chat'
import { updateJob } from '../lib/actions/jobs'

async function processJobs() {
  console.log('Worker started, polling for jobs...')

  while (true) {
    try {
      const pendingJobs = await db.select()
        .from(jobs)
        .where(eq(jobs.status, 'pending'))
        .limit(10)

      for (const job of pendingJobs) {
        console.log(`Processing job ${job.id} (${job.type})...`)

        // Mark as processing
        await updateJob(job.id, { status: 'processing' })

        try {
          let result: any = null

          if (job.type === 'generate_report_context') {
            const { messages } = job.payload as { messages: any[] }
            result = await generateReportContext(messages)
          } else {
            throw new Error(`Unknown job type: ${job.type}`)
          }

          // Mark as completed
          await updateJob(job.id, {
            status: 'completed',
            result,
            updatedAt: new Date()
          })
          console.log(`Job ${job.id} completed successfully.`)
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error)
          await updateJob(job.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            updatedAt: new Date()
          })
        }
      }
    } catch (error) {
      console.error('Error in worker loop:', error)
    }

    // Wait for 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

processJobs().catch(console.error)
