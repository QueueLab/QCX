/**
 * Context Caching Utility for Gemini 3.1 Pro
 * Reduces token usage for long conversation histories by caching stable context
 */

import { CoreMessage } from 'ai';

interface CachedContext {
  conversationId: string;
  messageCheckpoint: number;
  cachedPrefix: string;
  systemPrompt: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const contextCache = new Map<string, CachedContext>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;

/**
 * Generate a cache key based on conversation ID and message count
 */
function generateCacheKey(conversationId: string, messageCount: number): string {
  return `${conversationId}:${messageCount}`;
}

/**
 * Cache conversation context to reduce token usage
 */
export function cacheConversationContext(
  conversationId: string,
  messages: CoreMessage[],
  systemPrompt: string
): void {
  const messageCheckpoint = messages.length;
  const cacheKey = generateCacheKey(conversationId, messageCheckpoint);

  // Create a serialized prefix of the conversation
  const cachedPrefix = messages
    .slice(0, Math.floor(messages.length * 0.8)) // Cache first 80% of messages
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : '[complex content]'}`)
    .join('\n');

  const cachedContext: CachedContext = {
    conversationId,
    messageCheckpoint,
    cachedPrefix,
    systemPrompt,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  };

  contextCache.set(cacheKey, cachedContext);

  // Cleanup old entries if cache exceeds max size
  if (contextCache.size > MAX_CACHE_SIZE) {
    const oldestKey = Array.from(contextCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    contextCache.delete(oldestKey);
  }
}

/**
 * Retrieve cached context if available and not expired
 */
export function getCachedContext(
  conversationId: string,
  messageCount: number
): CachedContext | null {
  const cacheKey = generateCacheKey(conversationId, messageCount);
  const cached = contextCache.get(cacheKey);

  if (!cached) return null;

  // Check if cache has expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    contextCache.delete(cacheKey);
    return null;
  }

  return cached;
}

/**
 * Clear cache for a specific conversation
 */
export function clearConversationCache(conversationId: string): void {
  const keysToDelete: string[] = [];
  for (const [key] of contextCache.entries()) {
    if (key.startsWith(conversationId)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => contextCache.delete(key));
}

/**
 * Clear all cached contexts
 */
export function clearAllContextCache(): void {
  contextCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    size: contextCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
  };
}
