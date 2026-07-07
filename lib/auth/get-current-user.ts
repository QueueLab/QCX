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
 * Resolves a Clerk User ID to our internal database UUID.
 * If the user doesn't exist in our DB yet, it will create one.
 *
 * @param clerkUserId The Clerk user ID to resolve
 * @returns {Promise<string | null>} Our internal database UUID for the user
 */
export async function resolveClerkUserToDbUser(clerkUserId: string): Promise<string | null> {
  if (AUTH_DISABLED_FLAG && clerkUserId === MOCK_USER_ID) {
    // Return a consistent UUID for the mock user
    return '00000000-0000-0000-0000-000000000000';
  }

  if (!clerkUserId) return null;

  try {
    // 1. Try to find the user by clerkUserId
    const [existingUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (existingUser) {
      return existingUser.id;
    }

    // 2. If not found, fetch user details from Clerk and create a new record
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // 2.1 Check if user with this email already exists
    if (email) {
      const [existingEmailUser] = await db.select({ id: users.id, clerkUserId: users.clerkUserId })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmailUser) {
        // Link the existing user to this Clerk ID if not already linked
        if (!existingEmailUser.clerkUserId) {
          await db.update(users)
            .set({ clerkUserId })
            .where(eq(users.id, existingEmailUser.id));
        }
        return existingEmailUser.id;
      }
    }

    // 2.2 Create new user if no match found
    const [newUser] = await db.insert(users).values({
      clerkUserId,
      email,
      role: 'viewer',
    }).returning({ id: users.id });

    return newUser.id;
  } catch (error) {
    console.error('[Auth] Error resolving Clerk user to DB user:', error);
    return null;
  }
}

/**
 * Retrieves the current user's internal database ID (UUID) in server-side contexts.
 *
 * @returns {Promise<string | null>} The internal user UUID if authenticated, otherwise null.
 */
export async function getCurrentUserIdOnServer(): Promise<string | null> {
  const clerkUserId = await getClerkUserIdOnServer();
  if (!clerkUserId) return null;

  return await resolveClerkUserToDbUser(clerkUserId);
}
