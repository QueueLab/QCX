'use server'

import { unstable_noStore as noStore } from "next/cache";
import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { users as usersSchema } from "@/lib/db/schema";
import { syncUserWithDatabase } from "./users";
import { db } from '@/lib/db'
import { calendarNotes } from '@/lib/db/schema'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import type { CalendarNote, NewCalendarNote } from '@/lib/types'
import { createMessage, NewMessage } from './chat-db'
import { generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import { z } from 'zod';

/**
 * Retrieves notes for a specific date and chat session.
 * @param date - The date to fetch notes for.
 * @param chatId - The ID of the chat session.
 * @returns A promise that resolves to an array of notes.
 */
export async function getNotes(date: Date, chatId: string | null): Promise<CalendarNote[]> {
  noStore();
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

  if (!db) {
    return potentialEmails;
  }

  try {
    const validatedIds: string[] = [];
    for (const mention of potentialEmails) {
      const results = await db.select({ id: usersSchema.id })
        .from(usersSchema)
        .where(ilike(usersSchema.email, `${mention}%`))
        .limit(1)
        .execute();

      if (results.length > 0) {
        validatedIds.push(results[0].id);
      } else {
        validatedIds.push(mention);
      }
    }
    return Array.from(new Set(validatedIds));
  } catch (error) {
    console.error("Error validating mentions:", error);
    return potentialEmails;
  }
}

/**
 * Extracts location name using AI and geocodes it.
 */
async function extractAndGeocodeLocation(content: string) {
  try {
    const model = await getModel();
    const { object } = await generateObject({
      model,
      schema: z.object({
        location: z.string().optional().describe('A location name mentioned in the text'),
      }),
      prompt: `Extract a single primary location name from the following note content. If no location is mentioned, leave it empty.

      Content: "${content}"`,
    });

    if (object.location) {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!token) {
        console.warn('Mapbox token missing for geocoding');
        return null;
      }
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(object.location)}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return {
          type: 'Point',
          coordinates: [lng, lat],
          place_name: data.features[0].place_name
        };
      }
    }
  } catch (error) {
    console.error('Error in extractAndGeocodeLocation:', error);
  }
  return null;
}

/**
 * Saves a new note or updates an existing one.
 */
export async function saveNote(noteData: NewCalendarNote | CalendarNote): Promise<CalendarNote | null> {
  noStore();
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
        console.error('saveNote: User not authenticated');
        return null;
    }

    // Ensure current user is synced if possible
    await syncUserWithDatabase();

    const userTags = await extractAndValidateMentions(noteData.content);

    // AI-driven location extraction if not manually tagged
    let locationTags = noteData.locationTags;
    let updatedContent = noteData.content;

    if (!locationTags) {
      const aiLocation = await extractAndGeocodeLocation(noteData.content);
      if (aiLocation) {
        locationTags = aiLocation;
        if (!updatedContent.includes('#location')) {
          updatedContent = `${updatedContent} #location`;
        }
      }
    }

    if (!db) {
      console.warn('saveNote: Database unavailable, returning mock saved note');
      return {
        ...noteData,
        content: updatedContent,
        id: ('id' in noteData) ? noteData.id : Math.random().toString(36).substr(2, 9),
        userId,
        userTags,
        locationTags,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CalendarNote;
    }

    if ('id' in noteData) {
        // Update existing note
        try {
            const [updatedNote] = await db
                .update(calendarNotes)
                .set({
                  ...noteData,
                  content: updatedContent,
                  userTags,
                  locationTags,
                  updatedAt: new Date()
                })
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
                .values({
                  ...noteData,
                  content: updatedContent,
                  userTags,
                  locationTags,
                  userId
                })
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
