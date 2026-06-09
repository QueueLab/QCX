import { handleCallback } from '@vercel/queue';
import { generateReportContext } from '@/lib/actions/chat';
import { updateJob, getJob } from '@/lib/actions/jobs';
import { NextRequest } from 'next/server';

const queueHandler = handleCallback(async (payload: any) => {
  const { jobId } = payload;
  if (!jobId) {
    console.error('No jobId in queue payload');
    return;
  }

  try {
    const job = await getJob(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    await updateJob(jobId, { status: 'processing' });

    const { messages } = job.payload as { messages: any[] };
    const result = await generateReportContext(messages);

    await updateJob(jobId, {
      status: 'completed',
      result,
      updatedAt: new Date(),
    });
    console.log(`Job ${jobId} completed via Vercel Queue`);
  } catch (error) {
    console.error(`Job ${jobId} failed in Vercel Queue:`, error);
    await updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    });
  }
});

export async function POST(request: NextRequest) {
  return queueHandler(request);
}
