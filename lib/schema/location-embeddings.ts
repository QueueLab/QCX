import { z } from 'zod'

export const locationEmbeddingsQuerySchema = z.object({
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe('Latitude coordinate (-90 to 90)'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe('Longitude coordinate (-180 to 180)'),
  top_k: z
    .number()
    .int()
    .positive()
    .optional()
    .default(10)
    .describe('Number of top embedding search results to return (default: 10)'),
  tenantId: z
    .string()
    .optional()
    .describe('Optional tenant ID for the embeddings API (defaults to configured tenant ID)'),
  collectionId: z
    .string()
    .optional()
    .describe('Optional collection ID for the embeddings API (defaults to configured collection ID)'),
  apiKey: z
    .string()
    .optional()
    .describe('Optional API key override for the embeddings API')
})

export type LocationEmbeddingsQuery = z.infer<typeof locationEmbeddingsQuerySchema>
