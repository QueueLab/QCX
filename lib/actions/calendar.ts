'use server'

import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calendarNotes } from '@/lib/db/schema'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import type { CalendarNote, NewCalendarNote } from '@/lib/types'
import { createMessage, NewMessage } from './chat-db'

/**
 * Retrieves notes for a specific date and chat session.
 * @param date - The date to fetch notes for.
 * @param chatId - The ID of the chat session.
 * @returns A promise that resolves to an array of notes.
 */
export async function getNotes(date: Date, chatId: string | null): Promise<CalendarNote[]> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.error('getNotes: User not authenticated')
    return []
  }

  // Normalize date to the start of the day for consistent querying
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)

  try {
    const whereConditions = [eq(calendarNotes.userId, userId)];
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

    // Filter by date in application logic
    return notes.filter(note => {
        const noteDate = new Date(note.date);
        return noteDate >= startDate && noteDate <= endDate;
    });

  } catch (error) {
    console.error('Error fetching notes:', error)
    return []
  }
}

/**
 * Saves a new note or updates an existing one.
 * @param noteData - The note data to save.
 * @returns A promise that resolves to the saved note or null if an error occurs.
 */
export async function saveNote(noteData: NewCalendarNote | CalendarNote): Promise<CalendarNote | null> {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
        console.error('saveNote: User not authenticated');
        return null;
    }

    if ('id' in noteData) {
        // Update existing note
        try {
            const [updatedNote] = await db
                .update(calendarNotes)
                .set({ ...noteData, updatedAt: new Date() })
                .where(and(eq(calendarNotes.id, noteData.id), eq(calendarNotes.userId, userId)))
                .returning();
            return updatedNote;
        } catch (error) {
            console.error('Error updating note:', error);
            return null;
        }
    } else {
        // Create new note
        try {
            const [newNote] = await db
                .insert(calendarNotes)
                .values({ ...noteData, userId })
                .returning();

            if (newNote && newNote.chatId) {
                const calendarContextMessage: NewMessage = {
                    chatId: newNote.chatId,
                    userId: userId,
                    role: 'data',
                    content: JSON.stringify({
                        type: 'calendar_note',
                        note: newNote,
                    }),
                };
                await createMessage(calendarContextMessage);
            }

            return newNote;
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    }
}
