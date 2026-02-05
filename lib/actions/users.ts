'use server';

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

// In-memory store for role management simulation
let usersStore: Record<string, Array<User>> = {
  'default-user': [
    { id: '1', email: 'admin@example.com', role: 'admin' },
    { id: '2', email: 'editor@example.com', role: 'editor' },
  ],
};

const simulateDBDelay = () => new Promise(resolve => setTimeout(resolve, 500));

export async function getUsers(userId: string = 'default-user'): Promise<{ users: User[] }> {
  await simulateDBDelay();
  if (!usersStore[userId]) {
    usersStore[userId] = [];
  }
  return { users: usersStore[userId] };
}

export async function addUser(userId: string = 'default-user', newUser: { email: string; role: UserRole }): Promise<{ user?: User; error?: string }> {
  await simulateDBDelay();
  if (!usersStore[userId]) {
    usersStore[userId] = [];
  }

  if (usersStore[userId].some(user => user.email === newUser.email)) {
    return { error: 'User with this email already exists.' };
  }

  const userToAdd: User = { ...newUser, id: Math.random().toString(36).substr(2, 9) };
  usersStore[userId].push(userToAdd);
  revalidatePath('/settings');
  return { user: userToAdd };
}

/**
 * Syncs the current authenticated user from Supabase to the local database.
 */
export async function syncUserWithDatabase() {
  const { user } = await getSupabaseUserAndSessionOnServer();
  if (!user) return null;

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(usersSchema.id, user.id),
    });

    if (!existingUser) {
      await db.insert(usersSchema).values({
        id: user.id,
        email: user.email,
      });
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
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save selected model.' };
  }
}
