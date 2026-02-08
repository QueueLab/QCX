'use server'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calendarNotes } from '@/lib/db/schema'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import type { CalendarNote, NewCalendarNote } from '@/lib/types'
import { createMessage } from '@/lib/supabase/persistence'

export async function getNotes(date: Date, chatId: string | null): Promise<CalendarNote[]> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.error('getNotes: User not authenticated')
    return []
  }

  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)

  try {
    const whereConditions = [
      eq(calendarNotes.userId, userId),
      and(
        sql`${calendarNotes.date} >= ${startDate}`,
        sql`${calendarNotes.date} <= ${endDate}`
      )
    ];

    if (chatId) {
      whereConditions.push(eq(calendarNotes.chatId, chatId));
    } else {
      whereConditions.push(isNull(calendarNotes.chatId));
    }

    const notes = await db
      .select()
      .from(calendarNotes)
      .where(and(...whereConditions))
      .orderBy(desc(calendarNotes.createdAt))
      .execute()

    return notes as CalendarNote[];

  } catch (error) {
    console.error('Error fetching notes:', error)
    return []
  }
}

export async function saveNote(noteData: NewCalendarNote | CalendarNote): Promise<CalendarNote | null> {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
        console.error('saveNote: User not authenticated');
        return null;
    }

    if ('id' in noteData) {
        try {
            const [updatedNote] = await db
                .update(calendarNotes)
                .set({ ...noteData, updatedAt: new Date() })
                .where(and(eq(calendarNotes.id, noteData.id), eq(calendarNotes.userId, userId)))
                .returning();
            return updatedNote as CalendarNote;
        } catch (error) {
            console.error('Error updating note:', error);
            return null;
        }
    } else {
        try {
            const [newNote] = await db
                .insert(calendarNotes)
                .values({ ...noteData, userId })
                .returning();

            if (newNote && newNote.chatId) {
                const calendarContextMessage = {
                    chat_id: newNote.chatId,
                    user_id: userId,
                    role: 'data' as const,
                    content: JSON.stringify({
                        type: 'calendar_note',
                        note: newNote,
                    }),
                };
                try {
                  await createMessage(calendarContextMessage);
                } catch (msgError) {
                  console.error('Failed to create calendar context message:', msgError);
                }
            }

            return newNote as CalendarNote;
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    }
}
