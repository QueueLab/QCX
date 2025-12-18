import { NextResponse, NextRequest } from 'next/server';
import { getChats } from '@/lib/actions/chat';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    // Temporarily allow without auth for testing
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const chats = await getChats(userId || null);
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Internal Server Error fetching chats' }, { status: 500 });
  }
}
