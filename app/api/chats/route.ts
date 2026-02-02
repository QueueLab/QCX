import { NextResponse, NextRequest } from 'next/server';
import { getChats } from '@/lib/actions/chat';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    
    // If unauthenticated, return empty chats list instead of 401
    // This allows the UI to gracefully handle unauthenticated state
    if (!userId) {
      return NextResponse.json({ chats: [] });
    }

    const chats = await getChats(userId);
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error fetching chats' },
      { status: 500 }
    );
  }
}
