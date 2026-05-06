import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import { Section } from '@/components/section'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'

interface CacheEntry {
  data: PartialRelated;
  timestamp: number;
}

// OPTIMIZATION: Cache for recent queries to avoid redundant API calls
const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(messages: CoreMessage[]): string {
  // Create a simple hash of the last few messages to use as cache key
  const recentMessages = messages.slice(-3);
  return JSON.stringify(recentMessages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : '[complex content]'
  })));
}

export async function querySuggestor(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  const objectStream = createStreamableValue<PartialRelated>()
  
  // OPTIMIZATION: Check cache first
  const cacheKey = getCacheKey(messages);
  const cachedEntry = queryCache.get(cacheKey) as CacheEntry | undefined;
  
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    // Return cached result immediately
    objectStream.done(cachedEntry.data);
    uiStream.append(
      <Section title="Related" separator={true}>
        <SearchRelated relatedQueries={objectStream.value} />
      </Section>
    )
    return cachedEntry.data;
  }

  // OPTIMIZATION: Append UI immediately with streaming value
  // This shows the section faster while data streams in
  uiStream.append(
    <Section title="Related" separator={true}>
      <SearchRelated relatedQueries={objectStream.value} />
    </Section>
  )

  let finalRelatedQueries: PartialRelated = {}
  
  // OPTIMIZATION: Use a more concise system prompt to reduce token usage
  const result = await streamObject({
    model: (await getModel()) as LanguageModel,
    system: `Generate 3 follow-up queries that explore the subject matter deeper. Format as JSON with an "items" array containing objects with "query" fields. Keep queries concise and relevant.`,
    messages,
    schema: relatedSchema,
    temperature: 0.7, // Lower temperature for more consistent results
  })

  // OPTIMIZATION: Stream updates but batch them to reduce re-render frequency
  let lastUpdateTime = Date.now();
  const UPDATE_THROTTLE = 200; // ms

  for await (const obj of result.partialObjectStream) {
    if (obj && typeof obj === 'object' && 'items' in obj) {
      const now = Date.now();
      // Only update UI if enough time has passed since last update
      if (now - lastUpdateTime > UPDATE_THROTTLE) {
        objectStream.update(obj as PartialRelated)
        lastUpdateTime = now;
      }
      finalRelatedQueries = obj as PartialRelated
    }
  }

  objectStream.done()
  
  // OPTIMIZATION: Cache the result
  queryCache.set(cacheKey, {
    data: finalRelatedQueries,
    timestamp: Date.now()
  });
  
  // OPTIMIZATION: Limit cache size to prevent memory issues
  if (queryCache.size > 50) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) {
      queryCache.delete(firstKey);
    }
  }

  return finalRelatedQueries
}
