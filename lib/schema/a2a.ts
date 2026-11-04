import { z } from 'zod'

export const a2aSchema = z.object({
  message: z.string().describe('The task prompt or query to send to the remote A2A agent'),
  targetAgent: z
    .string()
    .optional()
    .describe('The name, ID, or direct base URL of the target remote A2A agent'),
  parameters: z
    .string()
    .optional()
    .describe('Optional JSON string or text parameters for additional task context')
})

export type A2ASchema = z.infer<typeof a2aSchema>
