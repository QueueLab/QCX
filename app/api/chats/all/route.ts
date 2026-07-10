// Content for app/api/chats/all/route.ts
import { NextResponse } from 'next/server';
import { clearHistory as dbClearHistory } from '@/lib/actions/chat-db';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { revalidatePath } from 'next/cache';

/**
 * Clears all chat history for the authenticated user.
 * Includes retry logic for transient database connection errors
 * that can occur on serverless platforms (Vercel cold starts,
 * connection pool exhaustion).
 */
export async function DELETE() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const userId = await getCurrentUserIdOnServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const success = await dbClearHistory(userId);
      if (success) {
        revalidatePath('/');
        revalidatePath('/search', 'layout');
        return NextResponse.json({ message: 'History cleared successfully' }, { status: 200 });
      } else {
        // If this is the last attempt, return a failure response
        if (attempt === MAX_RETRIES) {
          return NextResponse.json({ error: 'Failed to clear history after multiple attempts' }, { status: 500 });
        }
        console.warn(`clearHistory returned false (attempt ${attempt}/${MAX_RETRIES}), retrying...`);
      }
    } catch (error) {
      console.error(`Error clearing history via API (attempt ${attempt}/${MAX_RETRIES}):`, error);
      if (attempt === MAX_RETRIES) {
        let errorMessage = 'Internal Server Error clearing history';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }
    }

    // Wait before retrying
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
}
