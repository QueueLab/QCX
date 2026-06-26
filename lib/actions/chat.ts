'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type Chat as OldChatType, type AIMessage } from '@/lib/types'
import {
  getChatsPage as dbGetChatsPage,
  getChat as dbGetChat,
  clearHistory as dbClearHistory,
  saveChat as dbSaveChat,
  createMessage as dbCreateMessage,
  getMessagesByChatId as dbGetMessagesByChatId,
  type Chat as DrizzleChat,
  type Message as DrizzleMessage,
  type NewChat as DbNewChat,
  type NewMessage as DbNewMessage
} from '@/lib/actions/chat-db'
import { db } from '@/lib/db'
import { users, systemPrompts, chatContexts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { generateText } from 'ai'
import { getModel } from '../utils'

export async function generateReportContext(messages: AIMessage[]) {
  try {
    const model = await getModel()

    const promptMessages = messages
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.type === 'response'))
      .map(msg => {
        const role = msg.role === 'user' ? 'user' as const : 'assistant' as const
        const rawContent =
          typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.map(p => (p && typeof p === 'object' && 'type' in p && p.type === 'text') ? p.text : '').join('\n')
              : JSON.stringify(msg.content)

        // Sanitize: strip huge base64 images if any are still in there
        const content = rawContent
          .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, '[image omitted]')
          .trim()

        return { role, content }
      })
      .filter(msg => msg.content.length > 0)

    const { text } = await generateText({
      model,
      system: `You are a high-level geospatial intelligence analyst. Based on the provided conversation, generate:
      1. A professional, concise report title (max 60 characters).
      2. A 150-200 word executive summary that synthesizes the intelligence findings, observations, and spatial analysis discussed.

      Format your response as a JSON object:
      {
        "title": "The Title Here",
        "summary": "The executive summary here..."
      }
      Do not include any other text or markdown formatting in your response.`,
      messages: promptMessages as any,
    })

    try {
      return JSON.parse(text) as { title: string; summary: string }
    } catch (e) {
      console.error('Failed to parse AI response for report context', {
        error: e instanceof Error ? e.message : String(e),
        preview: text.slice(0, 200)
      })
      // Fallback
      return {
        title: 'QCX Intelligence Analysis',
        summary: 'Executive summary generation failed, but manual review of the intelligence assessment is recommended.'
      }
    }
  } catch (error) {
    console.error('Error generating report context:', error)
    return {
      title: 'QCX Intelligence Analysis',
      summary: 'Automated executive summary is currently unavailable.'
    }
  }
}

export async function getChats(userId?: string | null): Promise<DrizzleChat[]> {
  if (!userId) {
    console.warn('getChats called without userId, returning empty array.')
    return []
  }

  try {
    const { chats } = await dbGetChatsPage(userId, 20, 0)
    return chats
  } catch (error) {
    console.error('Error fetching chats from DB:', error)
    return []
  }
}

export async function getChat(id: string, userId: string): Promise<DrizzleChat | null> {
  if (!userId) {
    console.warn('getChat called without userId.')
    return null;
  }
  try {
    const chat = await dbGetChat(id, userId)
    return chat
  } catch (error) {
    console.error(`Error fetching chat ${id} from DB:`, error)
    return null
  }
}

/**
 * Retrieves all messages for a specific chat.
 */
export async function getChatMessages(chatId: string): Promise<DrizzleMessage[]> {
  if (!chatId) {
    console.warn('getChatMessages called without chatId');
    return [];
  }
  try {
    return dbGetMessagesByChatId(chatId);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId} in getChatMessages:`, error);
    return [];
  }
}

export async function clearChats(
  userId?: string | null
): Promise<{ error?: string } | void> {
  const currentUserId = userId || (await getCurrentUserIdOnServer())
  if (!currentUserId) {
    console.error('clearChats: No user ID provided or found.')
    return { error: 'User ID is required to clear chats' }
  }

  try {
    const success = await dbClearHistory(currentUserId)
    if (!success) {
      return { error: 'Failed to clear chats from database.' }
    }
    revalidatePath('/')
    redirect('/')
  } catch (error) {
    console.error('Error clearing chats from DB:', error)
    return { error: 'Failed to clear chat history' }
  }
}

export async function saveChat(chat: OldChatType, userId: string): Promise<string | null> {
  if (!userId && !chat.userId) {
    console.error('saveChat: userId is required either as a parameter or in chat object.')
    return null;
  }
  const effectiveUserId = userId || chat.userId;

  const newChatData: DbNewChat = {
    id: chat.id,
    userId: effectiveUserId,
    title: chat.title || 'Untitled Chat',
    createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
    visibility: 'private',
    updatedAt: new Date(),
  };

  const newMessagesData: Omit<DbNewMessage, 'chatId'>[] = chat.messages.map(msg => ({
    id: msg.id,
    userId: effectiveUserId,
    role: msg.role,
    content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
  }));

  try {
    const savedChatId = await dbSaveChat(newChatData, newMessagesData);
    return savedChatId;
  } catch (error) {
    console.error('Error saving chat to DB:', error);
    return null;
  }
}

export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID.');
    return { error: 'User not authenticated' };
  }

  try {
    await db.insert(chatContexts)
      .values({ chatId, data: contextData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: chatContexts.chatId,
        set: { data: contextData, updatedAt: new Date() }
      });
    return { success: true };
  } catch (error) {
    console.error('updateDrawingContext: Error updating drawing context:', error);
    return { error: 'Failed to update drawing context' };
  }
}

export async function getDrawingContext(chatId: string) {
  try {
    const result = await db.select()
      .from(chatContexts)
      .where(eq(chatContexts.chatId, chatId))
      .limit(1);
    return result[0]?.data || null;
  } catch (error) {
    console.error('getDrawingContext: Error:', error);
    return null;
  }
}

export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) return { error: 'User ID is required' }
  if (!prompt) return { error: 'Prompt is required' }

  try {
    await db.insert(systemPrompts)
      .values({ userId, prompt, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemPrompts.userId,
        set: { prompt, updatedAt: new Date() }
      });

    return { success: true }
  } catch (error) {
    console.error('saveSystemPrompt: Error:', error)
    return { error: 'Failed to save system prompt' }
  }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  if (!userId) return null

  try {
    const result = await db.select({ prompt: systemPrompts.prompt })
      .from(systemPrompts)
      .where(eq(systemPrompts.userId, userId))
      .limit(1);

    return result[0]?.prompt || null;
  } catch (error) {
    console.error('getSystemPrompt: Error:', error)
    return null
  }
}
