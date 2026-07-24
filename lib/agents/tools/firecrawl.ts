import FirecrawlApp from '@mendable/firecrawl-js';

export function getFirecrawlClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey || apiKey === '') {
    throw new Error('FIRECRAWL_API_KEY is not configured or is empty. Please set it in your environment variables.');
  }
  return new FirecrawlApp({ apiKey });
}
