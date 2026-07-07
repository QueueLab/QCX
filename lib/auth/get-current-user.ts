import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const AUTH_DISABLED_FLAG =
  process.env.AUTH_DISABLED_FOR_DEV === 'true' &&
  process.env.NODE_ENV !== 'production';
const MOCK_USER_ID = 'dev-user-001'; // A consistent mock user ID for dev mode

/**
 * Retrieves the current user's Clerk ID in server-side contexts.
 *
 * @returns {Promise<string | null>} The Clerk user ID if authenticated, otherwise null.
 */
export async function getClerkUserIdOnServer(): Promise<string | null> {
  if (AUTH_DISABLED_FLAG) {
    return MOCK_USER_ID;
  }
  const { userId } = await auth();
  return userId;
}

/**
 * Resolves a Clerk User ID to our internal database ID.
 * If the user doesn't exist in our DB yet, it will create one.
 * With Clerk integration, the internal database ID IS the Clerk User ID.
 *
 * @param clerkUserId The Clerk user ID to resolve
 * @returns {Promise<string | null>} The user ID for the database
 */
export async function resolveClerkUserToDbUser(clerkUserId: string): Promise<string | null> {
  if (!clerkUserId) return null;

  try {
    // 1. Try to find the user by id (which is the clerkUserId)
    const [existingUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, clerkUserId))
      .limit(1);

    if (existingUser) {
      return existingUser.id;
    }

    // 2. If not found, fetch user details from Clerk and create a new record
    const clerkUser = await currentUser();
    if (!clerkUser) return clerkUserId; // Fallback to just returning the ID if we can't get more info

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // 2.1 Check if user with this email already exists (legacy migration support)
    // In a clean Clerk-only setup, this might not be strictly necessary if all IDs are Clerk IDs
    if (email) {
      const [existingEmailUser] = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmailUser) {
         // This is a bit tricky: if the existing user has a UUID as ID, we can't easily "change" it
         // without breaking foreign keys, unless we are in the middle of a migration.
         // Since we just changed users.id to text, we could theoretically update it,
         // but that's risky.
         // For now, if we find a match by email but the ID is different, we'll return the clerkUserId
         // and expect the webhook or sync process to handle merging if needed.
         if (existingEmailUser.id === clerkUserId) return existingEmailUser.id;
      }
    }

    // 2.2 Create new user if no match found
    await db.insert(users).values({
      id: clerkUserId,
      email,
      role: 'viewer',
    }).onConflictDoUpdate({
        target: users.id,
        set: { email }
    });

    return clerkUserId;
  } catch (error) {
    console.error('[Auth] Error resolving Clerk user to DB user:', error);
    return clerkUserId; // Fallback to clerkUserId even on error to allow operations to proceed
  }
}

/**
 * Retrieves the current user's internal database ID in server-side contexts.
 * With Clerk, the internal ID is the Clerk ID.
 *
 * @returns {Promise<string | null>} The internal user ID if authenticated, otherwise null.
 */
export async function getCurrentUserIdOnServer(): Promise<string | null> {
  const clerkUserId = await getClerkUserIdOnServer();
  if (!clerkUserId) return null;

  // We still call resolve to ensure the record exists in the 'users' table
  return await resolveClerkUserToDbUser(clerkUserId);
}
