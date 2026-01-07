import { NextResponse } from 'next/server';
import { clearChats } from '@/lib/actions/chat';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function DELETE() {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await clearChats(userId);
    if (result && 'error' in result) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'History cleared successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error clearing history via API:', error);
    let errorMessage = 'Internal Server Error clearing history';
    if (error instanceof Error && error.message) {
        errorMessage = error.message
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
