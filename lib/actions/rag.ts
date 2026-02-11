'use server'

import { getSupabaseServerClient } from '@/lib/supabase/client'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { embed } from 'ai'
import { getEmbeddingModel } from '@/lib/utils'

export async function retrieveContext(
  query: string,
  chatId?: string,
  location?: any
): Promise<string[]> {
  try {
    // Validate authentication
    const userId = await getCurrentUserIdOnServer()
    if (!userId) {
      console.error('retrieveContext: User must be authenticated')
      return []
    }

    const embeddingModel = getEmbeddingModel()
    if (!embeddingModel) {
      console.warn('retrieveContext: Embedding model unavailable, skipping context retrieval.')
      return []
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return []
    }

    // 1. Generate embedding for the query using AI SDK
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    })

    const queryEmbedding = embedding

    // 2. Perform hybrid search
    const geoFilter = location ? `POINT(${location.longitude} ${location.latitude})` : undefined
    const { data: searchData, error: searchError } = await supabase.rpc('hybrid_search', {
      query_emb: queryEmbedding,
      geo_filter: geoFilter,
      chat_id_filter: chatId,
    })

    if (searchError) {
      console.error('Error performing hybrid search:', searchError)
      return []
    }

    if (!Array.isArray(searchData)) {
      return []
    }

    return searchData.map((result: any) => result.content_snippet)
  } catch (error) {
    console.error('retrieveContext: Unexpected error:', error)
    return []
  }
}
