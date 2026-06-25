'use server';

import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { z } from 'zod';
import { createJob, updateJob, getJobByIdAndUserId } from './system-prompt-db';
import { getFirecrawlClient } from '@/lib/agents/tools/firecrawl';
import { getModel } from '@/lib/utils';
import { generateText } from 'ai';

const domainSchema = z.string().min(1).refine((val) => {
  try {
    // Basic validation to check if it's a valid URL or domain
    const url = val.startsWith('http') ? val : `https://${val}`;
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}, { message: "Invalid domain or URL" });

const STALENESS_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes
const WORKER_TIMEOUT_MS = 1000 * 60 * 2; // 2 minutes

export async function startSystemPromptGeneration(domain: string) {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    return { error: 'Unauthorized' };
  }

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const normalizedDomain = domain.startsWith('http') ? domain : `https://${domain}`;

  try {
    const job = await createJob({
      userId,
      domain: normalizedDomain,
      status: 'pending',
    });

    // Fire and forget background worker
    runBackgroundWorker(job.id, userId, normalizedDomain).catch(console.error);

    return { jobId: job.id };
  } catch (error) {
    console.error('Failed to start system prompt generation:', error);
    return { error: 'Failed to initiate job' };
  }
}

async function runBackgroundWorker(jobId: string, userId: string, domain: string) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Job execution timeout')), WORKER_TIMEOUT_MS)
  );

  try {
    await updateJob(jobId, userId, { status: 'processing' });

    const workPromise = (async () => {
      const firecrawl = getFirecrawlClient();
      const scrapeResult = await firecrawl.scrapeUrl(domain, {
        formats: ['markdown'],
      });

      if (!scrapeResult.success || !scrapeResult.markdown) {
        throw new Error(scrapeResult.error || 'Failed to scrape content');
      }

      const content = scrapeResult.markdown;
      if (content.length < 100) {
        throw new Error('Insufficient content scraped from domain');
      }

      const model = await getModel();
      const { text } = await generateText({
        model,
        system: 'You are an expert at creating concise and effective AI system prompts for business copilots.',
        prompt: `Based on the following content scraped from ${domain}, generate a concise system prompt (10-2000 characters) for an AI business copilot. The prompt should define the business's identity, products/services, tone, and how it should assist users.

        Content:
        ${content.substring(0, 5000)}`, // Limit content size for LLM
      });

      const finalPrompt = text.trim();
      if (finalPrompt.length < 10 || finalPrompt.length > 2000) {
        throw new Error('Generated prompt is outside the allowed length constraints');
      }

      await updateJob(jobId, userId, {
        status: 'complete',
        resultPrompt: finalPrompt,
      });
    })();

    await Promise.race([workPromise, timeoutPromise]);
  } catch (error: any) {
    console.error(`Background worker error for job ${jobId}:`, error);
    await updateJob(jobId, userId, {
      status: 'error',
      errorMessage: error.message || 'An unexpected error occurred during generation',
    });
  }
}

export async function getSystemPromptGenerationJob(jobId: string) {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    return { error: 'Unauthorized' };
  }

  const job = await getJobByIdAndUserId(jobId, userId);
  if (!job) {
    return { error: 'Job not found' };
  }

  // Staleness check
  if (job.status === 'pending' || job.status === 'processing') {
    const lastUpdate = new Date(job.updatedAt).getTime();
    const now = new Date().getTime();
    if (now - lastUpdate > STALENESS_THRESHOLD_MS) {
      return {
        status: 'error',
        errorMessage: 'Job timed out or was abandoned. Please try again.',
      };
    }
  }

  return {
    status: job.status,
    resultPrompt: job.resultPrompt,
    errorMessage: job.errorMessage,
  };
}
