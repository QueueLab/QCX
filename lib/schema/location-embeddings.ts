import { z } from 'zod'

export const locationEmbeddingsQuerySchema = z.object({
  query: z
    .string()
    .min(1)
    .max(10_000)
    .describe('Natural-language description of the satellite or aerial imagery to find'),
  location: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe('Optional place name or address to geocode and use as a search region'),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe('Optional latitude when coordinates are already known'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Optional longitude when coordinates are already known'),
  start_date: z
    .string()
    .date()
    .optional()
    .describe('Optional imagery start date in YYYY-MM-DD format'),
  end_date: z
    .string()
    .date()
    .optional()
    .describe('Optional imagery end date in YYYY-MM-DD format'),
  top_k: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .default(10)
    .describe('Number of top embedding search results to return (1-5000)')
})

export type LocationEmbeddingsQuery = z.infer<typeof locationEmbeddingsQuerySchema>
