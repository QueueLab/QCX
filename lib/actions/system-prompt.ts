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
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Explicitly reject localhost and internal/local hostnames
    if (hostname === 'localhost') return false;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;

    // Check private IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and 127.0.0.1
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);
      if (octet1 === 10) return false;
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      if (octet1 === 192 && octet2 === 168) return false;
      if (octet1 === 127) return false; // Loopback
    }

    return true;
  } catch (e) {
    return false;
  }
}, { message: "Invalid domain or URL. Only public domains/URLs are allowed." });

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

async function scrapeDomain(domain: string): Promise<string> {
  const targetUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey && apiKey !== 'mock_key' && apiKey !== '') {
    try {
      const firecrawl = getFirecrawlClient();
      const scrapeResult = await firecrawl.scrapeUrl(targetUrl, {
        formats: ['markdown'],
      });
      if (scrapeResult && 'markdown' in scrapeResult && scrapeResult.markdown) {
        return scrapeResult.markdown;
      }
    } catch (e) {
      console.warn('Firecrawl scraping failed, falling back to standard fetch scraper:', e);
    }
  }

  // Fallback scraper using standard fetch
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    const html = await response.text();
    // Basic extraction of visible text from HTML if it contains tags
    let textContent = html;
    if (html.includes('<html') || html.includes('<body')) {
      // Remove scripts, styles, and tags
      textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (textContent.length < 100) {
      throw new Error('Fallback fetch scraped insufficient content');
    }
    return textContent;
  } catch (error: any) {
    throw new Error(`Scraping failed: ${error.message || error}`);
  }
}

async function runBackgroundWorker(jobId: string, userId: string, domain: string) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Job execution timeout')), WORKER_TIMEOUT_MS)
  );

  try {
    await updateJob(jobId, userId, { status: 'processing' });

    const workPromise = (async () => {
      const content = await scrapeDomain(domain);

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
