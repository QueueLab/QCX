import { DeepPartial } from 'ai'
import { z } from 'zod'

export const nextActionSchema = z.object({
  next: z.enum(['inquire', 'proceed']), // "generate_ui"
  category: z.enum(['geospatial', 'web_search', 'general']).optional()
})

export type NextAction = DeepPartial<typeof nextActionSchema>
