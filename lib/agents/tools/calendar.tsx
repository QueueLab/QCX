import { tool } from 'ai'
import { calendarSchema } from '@/lib/schema/calendar'
import { saveNote, getChatNotes } from '@/lib/actions/calendar'
import { ToolProps } from '.'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { nanoid } from '@/lib/utils'

export const calendarTool = ({ uiStream }: ToolProps) =>
  tool({
    description: 'Create reminders, add notes to the calendar, or list existing notes for the current chat.',
    parameters: calendarSchema,
    execute: async ({ action, content, date, location }) => {
      // In a real execution, we need the chatId.
      // Since tools are called within the submit action context,
      // we might need to find a way to pass chatId here if it's not readily available.
      // For this implementation, we'll assume the AI state provides it or we handle it in app/actions.

      if (action === 'create_note' && content) {
        // We'll return a result that the caller (submit action) can use to actually save
        return {
          type: 'CALENDAR_ACTION',
          action: 'create',
          note: {
            content,
            date: date ? new Date(date) : new Date(),
            locationTags: location ? {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            } : null
          }
        }
      }

      if (action === 'list_notes') {
        return {
          type: 'CALENDAR_ACTION',
          action: 'list'
        }
      }

      return { error: 'Invalid calendar action' }
    }
  })
