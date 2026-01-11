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
  include_answer: z.boolean().default(true).describe('Include answer in the search results'),
  topic: z.enum(['general', 'news', 'finance']).optional().describe('The topic of the search'),
  time_range: z.enum(['y', 'year', 'd', 'day', 'month', 'week', 'm', 'w']).optional().describe('The time range for the search'),
  include_images: z.boolean().default(false).describe('Include images in the search results'),
  include_image_descriptions: z.boolean().default(false).describe('Include image descriptions in the search results'),
  include_raw_content: z.boolean().default(false).describe('Include raw content in the search results')
})

export type PartialInquiry = DeepPartial<typeof searchSchema>
