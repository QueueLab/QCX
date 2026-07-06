import { NextResponse, NextRequest } from 'next/server';
import { saveChat, createMessage, NewChat, NewMessage } from '@/lib/actions/chat-db';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { nanoid } from '@/lib/utils';
// import { generateUUID } from '@/lib/utils'; // Assuming generateUUID is in lib/utils as per PR context - not needed for PKs

// This is a simplified POST handler. PR #533's version might be more complex,
// potentially handling streaming AI responses and then saving.
// For now, this focuses on the database interaction part.
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Example: Distinguish between creating a new chat vs. adding a message to existing chat
    // The actual structure of `body` would depend on client-side implementation.
    // Let's assume a simple case: creating a new chat with an initial message.
    const { title, initialMessageContent, role = 'user' } = body;

    if (!initialMessageContent) {
        return NextResponse.json({ error: 'Initial message content is required' }, { status: 400 });
    }

    const newChatData: NewChat = {
      // id: generateUUID(), // Drizzle schema now has defaultRandom for UUIDs
      id: nanoid(),
      userId: userId,
      title: title || 'New Chat', // Default title if not provided
      // createdAt: new Date(), // Handled by defaultNow() in schema
      visibility: 'private', // Default visibility
    };

    // Use a transaction if creating chat and first message together
    // For simplicity here, let's assume saveChat handles chat creation and returns ID, then we create a message.
    // A more robust `saveChat` might create the chat and first message in one go.
    // The `saveChat` in chat-db.ts is designed to handle this.

    const firstMessage: Omit<NewMessage, 'chatId'> = {
        // id: generateUUID(), // Drizzle schema now has defaultRandom for UUIDs
        // chatId is omitted as it will be set by saveChat
        id: nanoid(),
      userId: userId,
        role: role as NewMessage['role'], // Ensure role type matches schema expectation
        content: initialMessageContent,
        // createdAt: new Date(), // Handled by defaultNow() in schema, not strictly needed here
    };

    // The saveChat in chat-db.ts is designed to take initial messages.
    const savedChatId = await saveChat(newChatData, [firstMessage]);

    if (!savedChatId) {
         return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 });
    }

    // Fetch the newly created chat and message to return (optional, but good for client)
    // For now, just return success and the new chat ID.
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
