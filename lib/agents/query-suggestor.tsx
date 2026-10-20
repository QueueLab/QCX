import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import { Section } from '@/components/section'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'
import { FOLLOWUP_TIMEOUT_MS, createDeadlineSignal, withTimeout } from '@/lib/utils/with-timeout'

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
    content: typeof m.content === 'string'
      ? m.content.slice(-500)
      : Array.isArray(m.content)
        ? m.content.map((p: any) => p?.text || '').join(' ').slice(-500)
        : '[complex content]'
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
  
  let result: any
  try {
    result = await withTimeout(Promise.resolve(streamObject({
      model: (await getModel()) as LanguageModel,
      system: `Generate exactly 3 concise follow-up queries that deepen the user's subject. Return only an object with an "items" array of objects containing non-empty "query" strings. Do not invent facts not present in the conversation.`,
      messages,
      schema: relatedSchema,
      temperature: 0,
      maxTokens: 300,
      abortSignal: createDeadlineSignal(FOLLOWUP_TIMEOUT_MS),
    })), FOLLOWUP_TIMEOUT_MS, 'Follow-up generation')
  } catch (error) {
    console.error('Follow-up generation unavailable:', error)
    const fallback: PartialRelated = { items: [] }
    objectStream.done(fallback)
    queryCache.set(cacheKey, { data: fallback, timestamp: Date.now() })
    return fallback
  }

  // OPTIMIZATION: Stream updates efficiently - update immediately on first item, then throttle
  let lastUpdateTime = 0;
  const UPDATE_THROTTLE = 100; // ms

  try {
    for await (const obj of result.partialObjectStream) {
      if (obj && typeof obj === 'object' && 'items' in obj) {
        finalRelatedQueries = obj as PartialRelated
        const now = Date.now();
        // Update UI immediately on first yield or after throttle interval
        if (lastUpdateTime === 0 || now - lastUpdateTime > UPDATE_THROTTLE) {
          objectStream.update(obj as PartialRelated)
          lastUpdateTime = now;
        }
      }
    }
  } catch (error) {
    console.error('Follow-up stream interrupted:', error)
  }

  const safeResult: PartialRelated = {
    items: (finalRelatedQueries.items || [])
      .filter((item): item is { query: string } => typeof item?.query === 'string' && item.query.trim().length > 0)
      .slice(0, 3)
      .map(item => ({ query: item.query.trim() }))
  }
  
  // OPTIMIZATION: Cache the result
  queryCache.set(cacheKey, {
    data: safeResult,
    timestamp: Date.now()
  });
  
  // OPTIMIZATION: Limit cache size to prevent memory issues
  if (queryCache.size > 50) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) {
      queryCache.delete(firstKey);
    }
  }

  objectStream.done(safeResult)
  return safeResult
}
