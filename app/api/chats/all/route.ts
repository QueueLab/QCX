// Content for app/api/chats/all/route.ts
import { NextResponse } from 'next/server';
import { clearHistory as dbClearHistory } from '@/lib/actions/chat-db';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { revalidatePath } from 'next/cache'; // For revalidating after clearing

export async function DELETE() {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await dbClearHistory(userId);
    if (success) {
      revalidatePath('/'); // Revalidate home or relevant pages
      revalidatePath('/search'); // Revalidate search path
      return NextResponse.json({ message: 'History cleared successfully' }, { status: 200 });
    } else {
      // This case might be redundant if dbClearHistory throws an error on failure,
      // but kept for explicitness if it returns false for "no error but nothing done".
      return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error clearing history via API:', error);
    let errorMessage = 'Internal Server Error clearing history';
    if (error instanceof Error && error.message) {
        // Use the error message from dbClearHistory if available (e.g., "User ID is required")
        // This depends on dbClearHistory actually throwing or returning specific error messages.
        // The current dbClearHistory in chat.ts returns {error: ...} which won't be caught here as an Error instance directly.
        // However, the dbClearHistory in chat-db.ts returns boolean.
        // Let's assume if dbClearHistory from chat-db.ts (which returns boolean) fails, it's a generic 500.
        // If it were to throw, that would be caught.
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
