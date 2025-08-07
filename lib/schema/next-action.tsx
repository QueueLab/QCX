import { DeepPartial } from 'ai'
import { z } from 'zod'

export const nextActionSchema = z.object({
  next: z.enum(['inquire', 'proceed']), // "generate_ui"
  reasoning: z.string()
})

export type NextAction = DeepPartial<typeof nextActionSchema>
