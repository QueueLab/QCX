import { auth, currentUser } from '@clerk/nextjs/server';

export async function getSupabaseUserAndSessionOnServer() {
  const { userId } = await auth();
  if (!userId) {
    return { user: null, session: null, error: null };
  }

  const user = await currentUser();

  return {
    user: user ? { ...user, id: userId } : null,
    session: null,
    error: null
  };
}

export async function getCurrentUserIdOnServer(): Promise<string | null> {
  const { userId } = await auth();
  return userId || null;
}
