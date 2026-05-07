export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from 'next/server';
import { saveChat, type NewChat, type NewMessage } from '@/lib/actions/chat-db';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, initialMessageContent, role = 'user', chatId } = body;

    if (!initialMessageContent) {
        return NextResponse.json({ error: 'Initial message content is required' }, { status: 400 });
    }

    const newChatData: NewChat = {
      id: chatId,
      userId: userId,
      title: title || 'New Chat',
      visibility: 'private',
    };

    const firstMessage: Omit<NewMessage, 'chatId'> = {
        userId: userId,
        role: role as NewMessage['role'],
        content: initialMessageContent,
    };

    const savedChatId = await saveChat(newChatData, [firstMessage]);

    if (!savedChatId) {
         return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Chat created successfully', chatId: savedChatId }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
