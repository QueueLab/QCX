import { z } from 'zod'

export const calendarSchema = z.object({
  action: z.string().describe('The action to perform: "create_note" or "list_notes"'),
  content: z.string().optional().describe('The content of the note or reminder'),
  date: z.string().optional().describe('The date for the note/reminder in ISO format'),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    place_name: z.string().optional()
  }).optional().describe('Optional location to associate with the note')
})

export type CalendarToolSchema = z.infer<typeof calendarSchema>
