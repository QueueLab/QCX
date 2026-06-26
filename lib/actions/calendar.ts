'use server'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calendarNotes, calendarNoteLocations, calendarNoteUserTags } from '@/lib/db/schema'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import type { CalendarNote, NewCalendarNote } from '@/lib/types'

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

    const notes = await db.query.calendarNotes.findMany({
      where: and(...whereConditions),
      orderBy: [desc(calendarNotes.createdAt)],
      with: {
        locations: {
          with: {
            location: true
          }
        },
        userTags: true
      }
    });

    return notes.map(note => ({
      ...note,
      locationTags: note.locations.map(l => l.location)[0] || null, // UI currently expects single object
      userTags: note.userTags.map(t => t.tag)
    })) as any;

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

    const { locationTags, userTags, ...directNoteData } = noteData as any;

    try {
        const result = await db.transaction(async (tx) => {
            let noteId: string;
            let savedNote: any;

            if ('id' in noteData) {
                const [updatedNote] = await tx
                    .update(calendarNotes)
                    .set({ ...directNoteData, updatedAt: new Date() })
                    .where(and(eq(calendarNotes.id, noteData.id), eq(calendarNotes.userId, userId)))
                    .returning();

                if (!updatedNote) return null;
                noteId = updatedNote.id;
                savedNote = updatedNote;
            } else {
                const [newNote] = await tx
                    .insert(calendarNotes)
                    .values({ ...directNoteData, userId })
                    .returning();

                if (!newNote) return null;
                noteId = newNote.id;
                savedNote = newNote;
            }

            if (locationTags !== undefined) {
                await tx.delete(calendarNoteLocations).where(eq(calendarNoteLocations.noteId, noteId));
                if (Array.isArray(locationTags) && locationTags.length > 0) {
                    await tx.insert(calendarNoteLocations).values(
                        locationTags.map((loc: any) => ({
                            noteId,
                            locationId: typeof loc === 'string' ? loc : loc.id
                        }))
                    );
                } else if (locationTags && typeof locationTags === 'object') {
                    await tx.insert(calendarNoteLocations).values({
                        noteId,
                        locationId: locationTags.id || locationTags // handle ID or object
                    });
                }
            }

            if (userTags !== undefined) {
                await tx.delete(calendarNoteUserTags).where(eq(calendarNoteUserTags.noteId, noteId));
                if (Array.isArray(userTags) && userTags.length > 0) {
                    await tx.insert(calendarNoteUserTags).values(
                        userTags.map((tag: string) => ({
                            noteId,
                            tag
                        }))
                    );
                }
            }

            return savedNote;
        });

        if (result && result.chatId) {
            const { createMessage } = await import('./chat-db');
            await createMessage({
                chatId: result.chatId,
                userId: userId,
                role: 'data',
                content: JSON.stringify({
                    type: 'calendar_note',
                    note: {
                        ...result,
                        locationTags,
                        userTags
                    },
                }),
            });
        }

        return result;
    } catch (error) {
        console.error('Error saving note:', error);
        return null;
    }
}
