'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, ilike } from 'drizzle-orm';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string | null;
  role: string | null;
}

/**
 * Retrieves all users from the database.
 * Restricted to admins in a real app, but following current structure for now.
 */
export async function getUsers(): Promise<{ users: User[] }> {
  noStore();
  try {
    const result = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
    }).from(users);

    return { users: result };
  } catch (error) {
    console.error('[Action: getUsers] Error fetching users:', error);
    return { users: [] };
  }
}

/**
 * Adds a new user to the database.
 * If the user already exists in auth.users, they should have a record in public.users.
 * This action might be used for onboarding or admin management.
 */
export async function addUser(newUser: { email: string; role: UserRole }): Promise<{ user?: User; error?: string }> {
  try {
    // In Supabase, users are usually created via Auth.
    // This action assumes we're adding a record to the public.users table.
    // We'd typically need a UUID for 'id' that matches auth.users.id.
    // If this is just for internal user management, we'll insert a new record.

    const [insertedUser] = await db.insert(users).values({
      email: newUser.email,
      role: newUser.role,
    }).returning({
      id: users.id,
      email: users.email,
      role: users.role,
    });

    revalidatePath('/settings');
    return { user: insertedUser };
  } catch (error) {
    console.error('[Action: addUser] Error adding user:', error);
    return { error: 'Failed to add user. Email might already exist.' };
  }
}

/**
 * Updates a user's role by their email.
 */
export async function updateUserRole(userEmail: string, newRole: UserRole): Promise<{ user?: User; error?: string }> {
  try {
    const [updatedUser] = await db.update(users)
      .set({ role: newRole })
      .where(eq(users.email, userEmail))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    if (!updatedUser) {
      return { error: 'User not found.' };
    }

    revalidatePath('/settings');
    return { user: updatedUser };
  } catch (error) {
    console.error('[Action: updateUserRole] Error updating role:', error);
    return { error: 'Failed to update user role.' };
  }
}

/**
 * Removes a user from the database by their email.
 */
export async function removeUser(userEmail: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const result = await db.delete(users).where(eq(users.email, userEmail)).returning();

    if (result.length === 0) {
      return { error: 'User not found.' };
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('[Action: removeUser] Error removing user:', error);
    return { error: 'Failed to remove user.' };
  }
}

/**
 * Fetches the selected model for the current user.
 */
export async function getSelectedModel(): Promise<string | null> {
  noStore();
  const userId = await getCurrentUserIdOnServer();
  if (!userId) return null;

  try {
    const result = await db.select({ selectedModel: users.selectedModel })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0]?.selectedModel || null;
  } catch (error) {
    console.error('[Action: getSelectedModel] Error:', error);
    return null;
  }
}

/**
 * Saves the selected model for the current user.
 */
export async function saveSelectedModel(model: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) return { success: false, error: 'Not authenticated' };

  try {
    await db.update(users)
      .set({ selectedModel: model })
      .where(eq(users.id, userId));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('[Action: saveSelectedModel] Error:', error);
    return { success: false, error: 'Failed to save selected model.' };
  }
}

/**
 * Searches users by email.
 */
export async function searchUsers(query: string) {
  noStore();
  if (!query) return [];

  try {
    const result = await db.select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(ilike(users.email, `%${query}%`))
    .limit(10);

    return result;
  } catch (error) {
    console.error('[Action: searchUsers] Error:', error);
    return [];
  }
}
