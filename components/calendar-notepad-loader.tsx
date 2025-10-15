import { getNotes } from '@/lib/actions/calendar'
import { CalendarNotepad } from './calendar-notepad'

interface CalendarNotepadLoaderProps {
  chatId?: string;
}

export async function CalendarNotepadLoader({ chatId }: CalendarNotepadLoaderProps) {
  const initialNotes = await getNotes(new Date(), chatId ?? null)

  return <CalendarNotepad initialNotes={initialNotes} chatId={chatId} />
}
