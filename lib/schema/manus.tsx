import { z } from 'zod'

export const manusSchema = z.object({
  prompt: z
    .string()
    .describe('The task prompt or instruction for the Manus agent'),
  agentProfile: z
    .enum(['manus-1.6', 'manus-1.6-lite', 'manus-1.6-max'])
    .default('manus-1.6')
    .describe(
      'Agent profile to use: manus-1.6 (balanced), manus-1.6-lite (faster), manus-1.6-max (most capable)'
    ),
  taskMode: z
    .enum(['chat', 'adaptive', 'agent'])
    .optional()
    .describe('Task execution mode: chat, adaptive, or agent'),
  interactiveMode: z
    .boolean()
    .default(false)
    .describe(
      'Enable interactive mode to allow Manus to ask follow-up questions when input is insufficient'
    )
})

export type ManusInput = z.infer<typeof manusSchema>
export type PartialManus = Partial<ManusInput>
