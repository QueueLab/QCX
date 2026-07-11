import { createStreamableUI } from 'ai/rsc'
import { documentRetrieveSchema } from '@/lib/schema/document-retrieve'
import type { ToolProps } from '.'
import { Card } from '@/components/ui/card'
import { SearchSkeleton } from '@/components/search-skeleton'
import RetrieveSection from '@/components/retrieve-section'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

interface DocumentChunkResult {
  id: string
  documentId: string
  chunkText: string
  similarity: number
}

export const documentRetrieveTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: 'Search and retrieve relevant information from uploaded documents and attachments',
  parameters: documentRetrieveSchema,
  execute: async ({ query, documentId }: { query: string; documentId?: string }) => {
    uiStream.append(<SearchSkeleton />)

    let results: DocumentChunkResult[] = []
    try {
      // 1. Resolve authenticated user server-side for access control
      const userId = await getCurrentUserIdOnServer()
      if (!userId) {
        uiStream.update(
          <Card className="p-4 mt-2 text-sm">You must be authenticated to search documents.</Card>
        )
        return []
      }

      // 2. Embed query
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-ada-002'),
        value: query,
      })

      // 3. Query DB via the match_document_chunks RPC, constrained by user ownership
      //    The documentId from the LLM is only an additional filter, never the sole access boundary.
      //    We join through documents to ensure only the current user's documents are searched.
      const rpcResult = await db.execute(sql`
        SELECT mc.id, mc.document_id as "documentId", mc.chunk_text as "chunkText", mc.similarity::float
        FROM match_document_chunks(
          ${JSON.stringify(embedding)}::vector,
          0.1,
          5,
          ${documentId || null}::uuid
        ) mc
        INNER JOIN documents d ON mc.document_id = d.id AND d.user_id = ${userId}::uuid
      `)

      results = rpcResult as unknown as DocumentChunkResult[]
      if (!results || results.length === 0) {
        uiStream.update(
          <Card className="p-4 mt-2 text-sm">No matching content found in your documents.</Card>
        )
        return []
      }
    } catch (error) {
      console.error('Document Retrieve tool error:', error)
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">An error occurred while searching document chunks.</Card>
      )
      return []
    }

    // Adapt retrieved chunks into the search results/retrieve UX component style
    const adaptedResults = {
      results: results.map((r) => ({
        title: `Document Match (Similarity: ${(r.similarity * 100).toFixed(1)}%)`,
        content: r.chunkText,
        url: '' // no URL for uploaded file chunks
      })),
      query,
      images: []
    }

    uiStream.update(<RetrieveSection data={adaptedResults} />)

    return results
  }
})
