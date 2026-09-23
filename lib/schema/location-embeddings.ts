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
    .describe('Number of top embedding search results to return (1-5000)'),
  geometry: z
    .object({
      type: z.enum(['Point', 'MultiPoint', 'Polygon', 'MultiPolygon']),
      coordinates: z.unknown()
    })
    .optional()
    .describe('Optional GeoJSON geometry used to filter results spatially')
})

export type LocationEmbeddingsQuery = z.infer<typeof locationEmbeddingsQuerySchema>
