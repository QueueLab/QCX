import { z } from 'zod'

export const videoSearchSchema = z.object({
  query: z.string().describe('The search query for videos.')
})

export type VideoSearch = z.infer<typeof videoSearchSchema>
