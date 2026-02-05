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

// In-memory store for fallback/mock mode
let usersStore: Record<string, Array<User>> = {
  'default-user': [
    { id: '1', email: 'admin@example.com', role: 'admin' },
    { id: '2', email: 'editor@example.com', role: 'editor' },
  ],
};

const simulateDBDelay = () => new Promise(resolve => setTimeout(resolve, 500));

/**
 * Fetches all users. Fallbacks to in-memory if DB is unavailable.
 */
export async function getUsers(userId: string = 'default-user'): Promise<{ users: User[] }> {
  if (db) {
    try {
      const results = await db.select().from(usersSchema);
      return { users: results as User[] };
    } catch (error) {
      console.error('Error fetching users from DB:', error);
    }
  }

  // Fallback
  await simulateDBDelay();
  if (!usersStore[userId]) {
    usersStore[userId] = [];
  }
  return { users: usersStore[userId] };
}

/**
 * Adds a new user. Fallbacks to in-memory if DB is unavailable.
 */
export async function addUser(userId: string = 'default-user', newUser: { email: string; role: UserRole }): Promise<{ user?: User; error?: string }> {
  if (db) {
    try {
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
      console.error('Error adding user to DB:', error);
    }
  }

  // Fallback
  await simulateDBDelay();
  if (!usersStore[userId]) {
    usersStore[userId] = [];
  }

  if (usersStore[userId].some(user => user.email === newUser.email)) {
    return { error: 'User with this email already exists.' };
  }

  const userToAdd: User = { ...newUser, id: Math.random().toString(36).substr(2, 9) };
  usersStore[userId].push(userToAdd);
  return { user: userToAdd };
}

/**
 * Updates a user's role. Fallbacks to in-memory if DB is unavailable.
 */
export async function updateUserRole(userId: string = 'default-user', userEmail: string, newRole: UserRole): Promise<{ user?: User; error?: string }> {
  if (db) {
    try {
      const [updated] = await db.update(usersSchema)
        .set({ role: newRole })
        .where(eq(usersSchema.email, userEmail))
        .returning();

      if (updated) return { user: updated as User };
    } catch (error) {
      console.error('Error updating role in DB:', error);
    }
  }

  // Fallback
  await simulateDBDelay();
  if (!usersStore[userId]) return { error: 'User list not found.' };

  const userIndex = usersStore[userId].findIndex(user => user.email === userEmail);
  if (userIndex === -1) return { error: 'User not found.' };

  usersStore[userId][userIndex].role = newRole;
  return { user: usersStore[userId][userIndex] };
}

/**
 * Removes a user. Fallbacks to in-memory if DB is unavailable.
 */
export async function removeUser(userId: string = 'default-user', userEmail: string): Promise<{ success?: boolean; error?: string }> {
  if (db) {
    try {
      const result = await db.delete(usersSchema)
        .where(eq(usersSchema.email, userEmail))
        .returning();

      if (result.length > 0) return { success: true };
    } catch (error) {
      console.error('Error removing user from DB:', error);
    }
  }

  // Fallback
  await simulateDBDelay();
  if (!usersStore[userId]) return { error: 'User list not found.' };

  const initialLength = usersStore[userId].length;
  usersStore[userId] = usersStore[userId].filter(user => user.email !== userEmail);

  if (usersStore[userId].length === initialLength) return { error: 'User not found.' };
  return { success: true };
}

/**
 * Updates settings and users (bulk update).
 */
export async function updateSettingsAndUsers(
  userId: string = 'default-user',
  formData: { users: Array<Omit<User, 'id'> & { id?: string }> }
): Promise<{ success: boolean; message?: string; users?: User[] }> {
  if (db) {
    try {
        const existingUsers = await db.select().from(usersSchema);
        const incomingEmails = new Set(formData.users.map(u => u.email));

        // Delete missing
        const toDelete = existingUsers.filter((u: any) => u.email && !incomingEmails.has(u.email));
        for (const u of toDelete) {
            if (u.email) await db.delete(usersSchema).where(eq(usersSchema.email, u.email));
        }

        // Upsert incoming
        for (const u of formData.users) {
            if (!u.email) continue;
            const existing = existingUsers.find((ex: any) => ex.email === u.email);
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
        console.error('Error updating settings and users in DB:', error);
    }
  }

  // Fallback
  await simulateDBDelay();
  usersStore[userId] = formData.users.map((u): User => ({
    id: u.id || Math.random().toString(36).substr(2, 9),
    email: u.email,
    role: u.role as UserRole,
  }));
  return { success: true, message: 'Settings updated (In-Memory).', users: usersStore[userId] };
}

/**
 * Syncs the current authenticated user.
 */
export async function syncUserWithDatabase() {
  const { user } = await getSupabaseUserAndSessionOnServer();
  if (!user || !user.email) return null;

  if (db) {
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(usersSchema.id, user.id),
      });

      if (!existingUser) {
        const existingByEmail = await db.select().from(usersSchema).where(eq(usersSchema.email, user.email)).limit(1);

        if (existingByEmail.length > 0) {
            await db.update(usersSchema)
              .set({ id: user.id })
              .where(eq(usersSchema.id, existingByEmail[0].id));
        } else {
            await db.insert(usersSchema).values({
              id: user.id,
              email: user.email,
              role: 'viewer'
            });
        }
      } else if (existingUser.email !== user.email) {
        await db.update(usersSchema)
          .set({ email: user.email })
          .where(eq(usersSchema.id, user.id));
      }
      return user.id;
    } catch (error) {
      console.error('Error syncing user with DB:', error);
    }
  }

  return user.id; // Just return ID in in-memory mode
}

/**
 * Searches for users by email prefix.
 */
export async function searchUsers(query: string) {
  if (!query || query.length < 1) return [];
  const searchTerm = query.startsWith('@') ? query.slice(1) : query;

  if (db) {
    try {
      const results = await db.select()
        .from(usersSchema)
        .where(ilike(usersSchema.email, `${searchTerm}%`))
        .limit(5);
      return results;
    } catch (error) {
      console.error('Error searching users in DB:', error);
    }
  }

  // Fallback: search in memory store (all users across all simulated contexts for convenience)
  const allInMemoryUsers = Object.values(usersStore).flat();
  return allInMemoryUsers.filter(u => u.email?.toLowerCase().startsWith(searchTerm.toLowerCase())).slice(0, 5);
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
