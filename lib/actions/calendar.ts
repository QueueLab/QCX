'use server'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { users as usersSchema } from "@/lib/db/schema";
import { syncUserWithDatabase } from "./users";
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

  if (!db) {
    console.warn('getNotes: Database unavailable, returning empty list');
    return [];
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

/**
 * Extracts @mentions from content and validates them against the users table.
 */
async function extractAndValidateMentions(content: string): Promise<string[]> {
  const mentionRegex = /@(\w+)/g;
  const matches = Array.from(content.matchAll(mentionRegex));
  const potentialEmails = matches.map(match => match[1]);

  if (potentialEmails.length === 0) return [];

  // If no DB, we just store the strings themselves as a fallback?
  // User asked for "tag user ... work in memory".
  // Let's store the usernames as tags if DB is missing.
  if (!db) {
    return potentialEmails;
  }

  try {
    const users = await db.select({ id: usersSchema.id, email: usersSchema.email })
      .from(usersSchema)
      .execute();

    const validatedIds: string[] = [];
    potentialEmails.forEach((mention: string) => {
      const found = users.find((u: any) => u.email?.toLowerCase().startsWith(mention.toLowerCase()));
      if (found) validatedIds.push(found.id);
      else validatedIds.push(mention); // Fallback to raw string if not found
    });

    return Array.from(new Set(validatedIds));
  } catch (error) {
    console.error("Error validating mentions:", error);
    return potentialEmails;
  }
}

/**
 * Saves a new note or updates an existing one.
 */
export async function saveNote(noteData: NewCalendarNote | CalendarNote): Promise<CalendarNote | null> {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
        console.error('saveNote: User not authenticated');
        return null;
    }

    // Ensure current user is synced if possible
    await syncUserWithDatabase();

    const userTags = await extractAndValidateMentions(noteData.content);

    if (!db) {
      console.warn('saveNote: Database unavailable, returning mock saved note');
      return {
        ...noteData,
        id: ('id' in noteData) ? noteData.id : Math.random().toString(36).substr(2, 9),
        userId,
        userTags,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CalendarNote;
    }

    if ('id' in noteData) {
        // Update existing note
        try {
            const [updatedNote] = await db
                .update(calendarNotes)
                .set({ ...noteData, userTags, updatedAt: new Date() })
                .where(and(eq(calendarNotes.id, noteData.id), eq(calendarNotes.userId, userId)))
                .returning();
            return updatedNote as CalendarNote;
        } catch (error) {
            console.error('Error updating note:', error);
            return null;
        }
    } else {
        // Create new note
        try {
            const [newNote] = await db
                .insert(calendarNotes)
                .values({ ...noteData, userTags, userId })
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

            return newNote as CalendarNote;
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    }
}
