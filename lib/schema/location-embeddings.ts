import { z } from 'zod'

export const MAX_LGND_RESULTS = 3

export const locationEmbeddingsQuerySchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Natural-language description of satellite/aerial imagery features (e.g. "heavy machinery used to fell timber", "construction sites", "recently cleared forest areas")'
    ),
  location: z
    .string()
    .optional()
    .describe(
      'Location name, state, or region to search (e.g. "Oregon", "Phoenix, Arizona", "Sacramento, California")'
    ),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe('Optional explicit latitude coordinate (-90 to 90)'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Optional explicit longitude coordinate (-180 to 180)'),
  top_k: z
    .number()
    .int()
    .min(MAX_LGND_RESULTS)
    .max(MAX_LGND_RESULTS)
    .optional()
    .default(MAX_LGND_RESULTS)
    .describe('Always return the top three embedding search results; top_k must be 3.'),
  tenantId: z
    .string()
    .optional()
    .describe('Optional tenant ID for the embeddings API'),
  collectionId: z
    .string()
    .optional()
    .describe('Optional collection ID for the embeddings API'),
  apiKey: z
    .string()
    .optional()
    .describe('Optional API key override for the embeddings API')
})

export type LocationEmbeddingsQuery = z.infer<typeof locationEmbeddingsQuerySchema>
