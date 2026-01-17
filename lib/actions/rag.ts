'use server'

import { getSupabaseServerClient } from '@/lib/supabase/client'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

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

    const supabase = getSupabaseServerClient()

    // 1. Generate embedding for the query
    const { data: embeddingData, error: embeddingError } = await supabase.rpc('generate_embedding', { input: query })
    if (embeddingError || !embeddingData) {
      console.error('Error generating query embedding:', embeddingError)
      return []
    }
    const queryEmbedding = embeddingData as number[]

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

    return searchData.map((result: any) => result.content_snippet)
  } catch (error) {
    console.error('retrieveContext: Unexpected error:', error)
    return []
  }
}
