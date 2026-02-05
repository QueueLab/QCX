'use server';

import crypto from "crypto";
import { db } from "@/lib/db";
import { users as usersSchema } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import { getSupabaseUserAndSessionOnServer } from "@/lib/auth/get-current-user";
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define UserRole and User types
export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Fetches all users from the database.
 */
export async function getUsers(userId: string = 'default-user'): Promise<{ users: User[] }> {
  try {
    const results = await db.select().from(usersSchema);
    return { users: results as User[] };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { users: [] };
  }
}

/**
 * Adds a new user to the database.
 */
export async function addUser(userId: string = 'default-user', newUser: { email: string; role: UserRole }): Promise<{ user?: User; error?: string }> {
  try {
    // Check if user already exists
    const existing = await db.select().from(usersSchema).where(eq(usersSchema.email, newUser.email)).limit(1);
    if (existing.length > 0) {
      return { error: 'User with this email already exists.' };
    }

    const [inserted] = await db.insert(usersSchema).values({
      id: crypto.randomUUID(),
      email: newUser.email,
      role: newUser.role
    }).returning();

    return { user: inserted as User };
  } catch (error) {
    console.error('Error adding user:', error);
    return { error: 'Failed to add user.' };
  }
}

/**
 * Updates a user's role in the database.
 */
export async function updateUserRole(userId: string = 'default-user', userEmail: string, newRole: UserRole): Promise<{ user?: User; error?: string }> {
  try {
    const [updated] = await db.update(usersSchema)
      .set({ role: newRole })
      .where(eq(usersSchema.email, userEmail))
      .returning();

    if (!updated) return { error: 'User not found.' };
    return { user: updated as User };
  } catch (error) {
    console.error('Error updating role:', error);
    return { error: 'Failed to update user role.' };
  }
}

/**
 * Removes a user from the database.
 */
export async function removeUser(userId: string = 'default-user', userEmail: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const result = await db.delete(usersSchema)
      .where(eq(usersSchema.email, userEmail))
      .returning();

    if (result.length === 0) return { error: 'User not found.' };
    return { success: true };
  } catch (error) {
    console.error('Error removing user:', error);
    return { error: 'Failed to remove user.' };
  }
}

/**
 * Updates settings and users (bulk update).
 */
export async function updateSettingsAndUsers(
  userId: string = 'default-user',
  formData: { users: Array<Omit<User, 'id'> & { id?: string }> }
): Promise<{ success: boolean; message?: string; users?: User[] }> {
  try {
    const existingUsers = await db.select().from(usersSchema);
    const incomingEmails = new Set(formData.users.map(u => u.email));

    // Delete missing
    const toDelete = existingUsers.filter(u => u.email && !incomingEmails.has(u.email));
    for (const u of toDelete) {
        if (u.email) await db.delete(usersSchema).where(eq(usersSchema.email, u.email));
    }

    // Upsert incoming
    for (const u of formData.users) {
        if (!u.email) continue;
        const existing = existingUsers.find(ex => ex.email === u.email);
        if (existing) {
            await db.update(usersSchema)
                .set({ role: u.role })
                .where(eq(usersSchema.id, existing.id));
        } else {
            await db.insert(usersSchema).values({
                id: u.id || crypto.randomUUID(),
                email: u.email,
                role: u.role
            });
        }
    }

    const updatedUsers = await db.select().from(usersSchema);
    return { success: true, message: 'Settings and users updated successfully.', users: updatedUsers as User[] };
  } catch (error) {
    console.error('Error updating settings and users:', error);
    return { success: false, message: 'Failed to update settings and users.' };
  }
}

/**
 * Syncs the current authenticated user from Supabase to the local database.
 */
export async function syncUserWithDatabase() {
  const { user } = await getSupabaseUserAndSessionOnServer();
  if (!user || !user.email) return null;

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(usersSchema.id, user.id),
    });

    if (!existingUser) {
      // Check if user was added by email in settings
      const existingByEmail = await db.select().from(usersSchema).where(eq(usersSchema.email, user.email)).limit(1);

      if (existingByEmail.length > 0) {
          // Update the placeholder ID with the real Supabase ID
          await db.update(usersSchema)
            .set({ id: user.id })
            .where(eq(usersSchema.id, existingByEmail[0].id));
      } else {
          await db.insert(usersSchema).values({
            id: user.id,
            email: user.email,
            role: 'viewer' // Default role for synced users
          });
      }
    } else if (existingUser.email !== user.email) {
      await db.update(usersSchema)
        .set({ email: user.email })
        .where(eq(usersSchema.id, user.id));
    }
    return user.id;
  } catch (error) {
    console.error('Error syncing user:', error);
    return null;
  }
}

/**
 * Searches for users in the database by email prefix.
 */
export async function searchUsers(query: string) {
  if (!query || query.length < 1) return [];

  const searchTerm = query.startsWith('@') ? query.slice(1) : query;

  try {
    const results = await db.select()
      .from(usersSchema)
      .where(ilike(usersSchema.email, `${searchTerm}%`))
      .limit(5);
    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// Keep the model config logic
const modelConfigPath = path.resolve(process.cwd(), 'config', 'model.json');

export async function getSelectedModel(): Promise<string | null> {
  noStore();
  try {
    const data = await fs.readFile(modelConfigPath, 'utf8');
    const config = JSON.parse(data);
    return config.selectedModel || null;
  } catch (error) {
    return null;
  }
}

export async function saveSelectedModel(model: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.stringify({ selectedModel: model }, null, 2);
    await fs.writeFile(modelConfigPath, data, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save selected model.' };
  }
}
