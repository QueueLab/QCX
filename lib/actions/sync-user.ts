'use server';

import { currentUser } from '@clerk/nextjs/server';
import { resolveClerkUserToDbUser } from '@/lib/auth/get-current-user';

/**
 * Server action to ensure the current Clerk user is synchronized with our database.
 * This can be called from a client component on mount.
 */
export async function syncUser() {
  const user = await currentUser();
  if (!user) return null;

  return await resolveClerkUserToDbUser(user.id);
}
