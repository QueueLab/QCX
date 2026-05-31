import { DeepPartial } from 'ai'
import { z } from 'zod'

// Simplified schema to reduce nested complexity for better model compatibility.
// Items are now plain strings instead of objects with a 'query' property.
export const relatedSchema = z.object({
  items: z.array(z.string()).length(3)
})

export type PartialRelated = DeepPartial<typeof relatedSchema>

export type Related = z.infer<typeof relatedSchema>
