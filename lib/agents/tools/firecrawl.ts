import FirecrawlApp from '@mendable/firecrawl-js';

export function getFirecrawlClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not set');
  }
  return new FirecrawlApp({ apiKey });
}
