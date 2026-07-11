import { createStreamableUI } from 'ai/rsc'
import { documentRetrieveSchema } from '@/lib/schema/document-retrieve'
import { ToolProps } from '.'
import { Card } from '@/components/ui/card'
import { SearchSkeleton } from '@/components/search-skeleton'
import RetrieveSection from '@/components/retrieve-section'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'

export const documentRetrieveTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: 'Search and retrieve relevant information from uploaded documents and attachments',
  parameters: documentRetrieveSchema,
  execute: async ({ query, documentId }: { query: string; documentId?: string }) => {
    let hasError = false
    uiStream.append(<SearchSkeleton />)

    let results: any[] = []
    try {
      // 1. Embed query
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-ada-002'),
        value: query,
      })

      // 2. Query DB via the match_document_chunks RPC
      const rpcResult = await db.execute(sql`
        SELECT id, document_id as "documentId", chunk_text as "chunkText", similarity::float FROM match_document_chunks(
          ${JSON.stringify(embedding)}::vector,
          0.1,
          5,
          ${documentId || null}::uuid
        )
      `)

      results = rpcResult as any[]
      if (!results || results.length === 0) {
        hasError = true
      }
    } catch (error) {
      hasError = true
      console.error('Document Retrieve tool error:', error)
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">An error occurred while searching document chunks.</Card>
      )
      return []
    }

    if (hasError) {
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">No matching content found in the document.</Card>
      )
      return []
    }

    // Adapt retrieved chunks into the search results/retrieve UX component style
    const adaptedResults = {
      results: results.map((r: any) => ({
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
