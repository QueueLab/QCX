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
  role: UserRole | null;
}

/**
 * Ensures the current user is an admin.
 * Throws an error if not authorized.
 */
async function requireAdmin() {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const [user] = await db.select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
}

/**
 * Retrieves all users from the database.
 * Restricted to admins.
 */
export async function getUsers(): Promise<{ users: User[] }> {
  noStore();
  try {
    await requireAdmin();
    const result = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
    }).from(users);

    // Type cast since we know roles in DB match UserRole or null
    return { users: result as User[] };
  } catch (error: any) {
    console.error('[Action: getUsers] Error:', error.message);
    return { users: [] };
  }
}

/**
 * Adds a new user to the database.
 * Restricted to admins.
 */
export async function addUser(newUser: { email: string; role: UserRole }): Promise<{ user?: User; error?: string }> {
  try {
    await requireAdmin();

    // Check if email already exists to provide a clear error message
    const [existing] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, newUser.email))
      .limit(1);

    if (existing) {
      return { error: 'A user with this email already exists.' };
    }

    const [insertedUser] = await db.insert(users).values({
      email: newUser.email,
      role: newUser.role,
    }).returning({
      id: users.id,
      email: users.email,
      role: users.role,
    });

    revalidatePath('/settings');
    return { user: insertedUser as User };
  } catch (error: any) {
    console.error('[Action: addUser] Error:', error.message);
    return { error: error.message || 'Failed to add user.' };
  }
}

/**
 * Updates a user's role by their email.
 * Restricted to admins.
 */
export async function updateUserRole(userEmail: string, newRole: UserRole): Promise<{ user?: User; error?: string }> {
  try {
    await requireAdmin();
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
    return { user: updatedUser as User };
  } catch (error: any) {
    console.error('[Action: updateUserRole] Error:', error.message);
    return { error: error.message || 'Failed to update user role.' };
  }
}

/**
 * Removes a user from the database by their email.
 * Restricted to admins.
 */
export async function removeUser(userEmail: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();
    const result = await db.delete(users).where(eq(users.email, userEmail)).returning();

    if (result.length === 0) {
      return { error: 'User not found.' };
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('[Action: removeUser] Error:', error.message);
    return { error: error.message || 'Failed to remove user.' };
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
 * Restricted to authenticated users.
 */
export async function searchUsers(query: string) {
  noStore();
  if (!query) return [];

  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    throw new Error('Unauthorized');
  }

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

import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Fetches the SkyFi config for the current user.
 */
export async function getSkyfiConfig(): Promise<{ apiKey?: string; initialized?: boolean } | null> {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) return null;
  try {
    const result = await db.select({ metadata: users.metadata })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const metadata = result[0]?.metadata as any;
    return metadata?.skyfi || null;
  } catch (error) {
    console.error('[Action: getSkyfiConfig] Error:', error);
    return null;
  }
}

/**
 * Saves the SkyFi config for the current user.
 */
export async function saveSkyfiConfig(config: { apiKey?: string; initialized?: boolean }): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) return { success: false, error: 'Not authenticated' };
  try {
    const result = await db.select({ metadata: users.metadata })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const currentMetadata = (result[0]?.metadata as Record<string, any>) || {};

    await db.update(users)
      .set({
        metadata: {
          ...currentMetadata,
          skyfi: config
        }
      })
      .where(eq(users.id, userId));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('[Action: saveSkyfiConfig] Error:', error);
    return { success: false, error: 'Failed to save SkyFi configuration.' };
  }
}

/**
 * Tests connection to the SkyFi MCP server using the provided API key.
 */
export async function testSkyfiConnection(apiKey: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API Key is required.' };
  }

  const serverUrl = new URL('https://mcp.skyfi.com/mcp');
  let transport;
  let client;

  try {
    transport = new StreamableHTTPClientTransport(serverUrl, {
      requestInit: {
        headers: {
          'X-Skyfi-Api-Key': apiKey,
        }
      }
    });
    client = new MCPClientClass({ name: 'SkyfiTestClient', version: '1.0.0' });

    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)),
    ]);

    const result = await Promise.race([
      client.callTool({ name: 'skyfi_whoami', arguments: {} }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tool call timeout after 10 seconds')), 10000)),
    ]);

    await client.close();

    const response = result as { content?: Array<{ text?: string }> };
    const textBlock = response?.content?.[0]?.text || '';

    return { success: true, data: textBlock };
  } catch (err: any) {
    console.error('[Action: testSkyfiConnection] Error:', err.message);
    if (client) {
      try { await client.close(); } catch {}
    }
    return { success: false, error: err.message || 'Failed to connect to SkyFi MCP.' };
  }
}
