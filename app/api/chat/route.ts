import { NextResponse, NextRequest } from 'next/server';
import { saveChat } from '@/lib/actions/chat';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { type Chat } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { checkAndConsumeCredits } from '@/lib/middleware/check-credits';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check and consume credits
    const creditCheck = await checkAndConsumeCredits(request, 10);
    if (creditCheck.error) {
       return NextResponse.json({ error: creditCheck.error }, { status: creditCheck.status });
    }

    const body = await request.json();
    const { title, initialMessageContent, role = 'user' }
    = body;

    if (!initialMessageContent) {
        return NextResponse.json({ error: 'Initial message content is required' }, { status: 400 });
    }

    const chatId = uuidv4();
    const newChat: Chat = {
      id: chatId,
      userId: userId,
      title: title || 'New Chat',
      createdAt: new Date(),
      path: `/chat/${chatId}`,
      messages: [
        {
          id: uuidv4(),
          role: role,
          content: initialMessageContent,
          createdAt: new Date(),
        }
      ]
    };

    const savedChatId = await saveChat(newChat, userId);

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
