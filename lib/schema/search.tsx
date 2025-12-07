import { DeepPartial } from 'ai'
import { z } from 'zod'

export const searchSchema = z.object({
  query: z.string().describe('The query to search for'),
  max_results: z
    .number()
    .max(20)
    .default(5)
    .describe('The maximum number of results to return'),
  search_depth: z
    .enum(['basic', 'advanced'])
    .default('basic')
    .describe('The depth of the search'),
  latitude: z.number().optional().describe('Optional latitude for the search'),
  longitude: z.number().optional().describe('Optional longitude for the search'),
  datetime: z.string().optional().describe('Optional datetime for the search (e.g., "2024-01-01 10:00:00")')
})

export type PartialInquiry = DeepPartial<typeof searchSchema>
