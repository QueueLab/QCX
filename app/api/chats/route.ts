import { NextResponse, NextRequest } from 'next/server';
import { getChatsPage } from '@/lib/actions/chat-db';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!request || !request.url) {
      const result = await getChatsPage(userId, 20, 0);
      return NextResponse.json(result);
    }

    const { searchParams } = new URL(request.url);

    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 100;
    const DEFAULT_OFFSET = 0;

    let limit = parseInt(searchParams.get('limit') || '', 10);
    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      limit = DEFAULT_LIMIT;
    }

    let offset = parseInt(searchParams.get('offset') || '', 10);
    if (isNaN(offset) || offset < 0) {
      offset = DEFAULT_OFFSET;
    }

    const result = await getChatsPage(userId, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Internal Server Error fetching chats' }, { status: 500 });
  }
}
