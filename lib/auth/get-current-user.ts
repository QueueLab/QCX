import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or, isNull } from 'drizzle-orm';

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
 * Also syncs the full Clerk profile (name, email, avatar) to the DB record.
 *
 * @param clerkUserId The Clerk user ID to resolve
 * @returns {Promise<string | null>} Our internal database UUID for the user
 */
export async function resolveClerkUserToDbUser(clerkUserId: string): Promise<string | null> {
  if (AUTH_DISABLED_FLAG && clerkUserId === MOCK_USER_ID) {
    // Return a consistent UUID for the mock user
    return '00000000-0000-0000-0000-000000000000';
  }

  try {
    // 1. Try to find the user by clerkUserId
    const [existingUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (existingUser) {
      // Sync profile data from Clerk to keep the record up to date
      await syncUserProfile(clerkUserId);
      return existingUser.id;
    }

    // 2. If not found, fetch user details from Clerk and create a new record
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error('Clerk session found but failed to retrieve user profile from Clerk.');
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || null;
    const firstName = clerkUser.firstName || null;
    const lastName = clerkUser.lastName || null;
    const avatarUrl = clerkUser.imageUrl || null;

    // 2.1 Check if user with this email already exists (maybe from Supabase auth or edge function)
    if (email) {
      const [existingEmailUser] = await db.select({ id: users.id, clerkUserId: users.clerkUserId })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmailUser) {
        // Link the existing user to this Clerk ID if not already linked
        if (!existingEmailUser.clerkUserId) {
          await db.update(users)
            .set({
              clerkUserId,
              firstName,
              lastName,
              avatarUrl,
            })
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
      firstName,
      lastName,
      avatarUrl,
    }).returning({ id: users.id });

    return newUser.id;
  } catch (error: any) {
    console.error('[Auth] Error resolving Clerk user to DB user:', error);
    throw new Error(`Failed to resolve Clerk user to database user: ${error.message}`);
  }
}

/**
 * Syncs the current Clerk user's profile data (name, avatar) to the database.
 * Called to keep the DB record in sync with Clerk profile updates.
 */
async function syncUserProfile(clerkUserId: string): Promise<void> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return;

    const firstName = clerkUser.firstName || null;
    const lastName = clerkUser.lastName || null;
    const avatarUrl = clerkUser.imageUrl || null;
    const email = clerkUser.emailAddresses[0]?.emailAddress || null;

    await db.update(users)
      .set({
        ...(firstName !== null && { firstName }),
        ...(lastName !== null && { lastName }),
        ...(avatarUrl !== null && { avatarUrl }),
        ...(email !== null && { email }),
      })
      .where(eq(users.clerkUserId, clerkUserId));
  } catch (error) {
    // Silently fail — this is a best-effort sync
    console.warn('[Auth] Error syncing user profile:', error);
  }
}

/**
 * Retrieves the current user's internal database ID (UUID) in server-side contexts.
 * This is a drop-in replacement for the previous getCurrentUserIdOnServer.
 *
 * @returns {Promise<string | null>} The internal user UUID if authenticated, otherwise null.
 */
export async function getCurrentUserIdOnServer(): Promise<string | null> {
  const clerkUserId = await getClerkUserIdOnServer();
  if (!clerkUserId) return null;

  return await resolveClerkUserToDbUser(clerkUserId);
}
