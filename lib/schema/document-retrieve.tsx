import { DeepPartial } from 'ai'
import { z } from 'zod'

export const documentRetrieveSchema = z.object({
  query: z.string().describe('The search query to find relevant sections in the uploaded document or knowledge base'),
  documentId: z.string().uuid().optional().describe('Optional ID of the specific document to search within')
})

export type PartialDocumentRetrieve = DeepPartial<typeof documentRetrieveSchema>
