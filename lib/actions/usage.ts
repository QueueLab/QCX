'use server'

import { db } from '@/lib/db'
import { usageEvents } from '@/lib/db/schema'
import { UsageEvent, UsageSummary } from '@/lib/types'
import { calculateLlmCost, getToolCost } from '@/lib/costs'
import { eq, sql, desc } from 'drizzle-orm'

export async function recordUsageEvent(payload: {
  userId: string;
  chatId?: string;
  kind: 'llm' | 'tool';
  source: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}) {
  try {
    let cost = '0.000000';
    if (payload.kind === 'llm') {
      cost = calculateLlmCost({
        modelId: payload.source,
        promptTokens: payload.promptTokens || 0,
        completionTokens: payload.completionTokens || 0
      }).toFixed(6);
    } else {
      cost = getToolCost(payload.source).toFixed(6);
    }

    await db.insert(usageEvents).values({
      userId: payload.userId,
      chatId: payload.chatId,
      kind: payload.kind,
      source: payload.source,
      promptTokens: payload.promptTokens,
      completionTokens: payload.completionTokens,
      totalTokens: payload.totalTokens || (payload.promptTokens || 0) + (payload.completionTokens || 0),
      cost: cost,
    });
  } catch (error) {
    console.error('Failed to record usage event:', error);
    // Best-effort: do not propagate
  }
}

export async function getUserUsageSummary(userId: string): Promise<UsageSummary> {
  try {
    const stats = await db.select({
      totalCost: sql<number>`sum(cast(cost as numeric))`,
      totalTokens: sql<number>`sum(total_tokens)`
    })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId));

    const recent = await db.select()
      .from(usageEvents)
      .where(eq(usageEvents.userId, userId))
      .orderBy(desc(usageEvents.createdAt))
      .limit(20);

    return {
      totalCost: stats[0]?.totalCost || 0,
      totalTokens: stats[0]?.totalTokens || 0,
      recentEvents: (recent as any) as UsageEvent[],
    };
  } catch (error) {
    console.error('Failed to get user usage summary:', error);
    return {
      totalCost: 0,
      totalTokens: 0,
      recentEvents: [],
    };
  }
}
