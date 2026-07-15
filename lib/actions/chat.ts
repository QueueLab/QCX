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
  deleteChat as dbDeleteChat,
  updateChat as dbUpdateChat,
  type Chat as DrizzleChat,
  type Message as DrizzleMessage,
  type NewChat as DbNewChat,
  type NewMessage as DbNewMessage
} from '@/lib/actions/chat-db'
import { db } from '@/lib/db'
import { users, chats, chatParticipants } from '@/lib/db/schema'
import { eq, or, and, sql } from 'drizzle-orm'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { normalizeMessageContent } from '../utils'
import { getModel } from '../utils/server'
import { executiveSummaryAgent } from '../agents/report/executive-summary'
import { strategicSynthesisAgent } from '../agents/report/strategic-synthesis'

/**
 * Retrieves all chats for a given user.
 */
export async function getAllChats(userId?: string): Promise<DrizzleChat[]> {
  const effectiveUserId = userId || (await getCurrentUserIdOnServer())
  if (!effectiveUserId) {
    console.warn('getAllChats called without userId.')
    return []
  }

  const allChats: DrizzleChat[] = []
  let offset = 0
  const limit = 50

  while (true) {
    const { chats, nextOffset } = await dbGetChatsPage(effectiveUserId, limit, offset)
    allChats.push(...chats)
    if (nextOffset === null) break
    offset = nextOffset
  }

  return allChats
}

/**
 * Aggregates cross-session messages for the user.
 */
export async function getCrossSessionContext(userId?: string): Promise<string> {
  const effectiveUserId = userId || (await getCurrentUserIdOnServer())
  if (!effectiveUserId) return ''

  const allChats = await getAllChats(effectiveUserId)
  // Sort by createdAt desc to prioritize most recent
  allChats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  let combinedText = ''
  const MAX_TOTAL_CHARS = 10000

  for (const chat of allChats) {
    const messages = await getChatMessages(chat.id)
    const chatContext = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => `[${msg.role.toUpperCase()}]: ${normalizeMessageContent(msg.content)}`)
      .join('\n')

    if (combinedText.length + chatContext.length > MAX_TOTAL_CHARS) {
      const remaining = MAX_TOTAL_CHARS - combinedText.length
      if (remaining > 50) {
        combinedText += chatContext.slice(0, remaining) + '... [truncated]'
      }
      break
    }
    combinedText += chatContext + '\n---\n'
  }

  return combinedText.trim()
}

export async function generateReportContext(messages: AIMessage[]) {
  try {
    const crossSessionContext = await getCrossSessionContext()

    const activeMessages = messages
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.type === 'response'))
      .map(msg => {
        const role = msg.role === 'user' ? 'user' as const : 'assistant' as const
        const content = normalizeMessageContent(msg.content)
        return { role, content }
      })
      .filter(msg => msg.content.length > 0)

    const sensorFusionFindings = messages
      .filter(msg => msg.type === 'resolution_search_result')
      .map(msg => {
        try {
          return JSON.parse(msg.content as string)
        } catch (e) {
          return { summary: msg.content }
        }
      })

    const strategicContent = activeMessages.filter(msg => msg.role === 'assistant')

    const [execSummary, strategicSynthesis] = await Promise.all([
      executiveSummaryAgent(crossSessionContext, activeMessages),
      strategicSynthesisAgent(sensorFusionFindings, strategicContent)
    ])

    return {
      ...execSummary,
      strategicOutput: strategicSynthesis.strategicOutput
    }
  } catch (error) {
    console.error('Error generating report context:', error)
    return {
      title: 'QCX Intelligence Analysis',
      summary: 'Automated report synthesis is currently unavailable.',
      strategicOutput: 'Strategic synthesis failed.'
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
    userId: msg.userId || effectiveUserId, // verify ownership per message
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

  const newDrawingMessage: DbNewMessage = {
    userId: userId,
    chatId: chatId,
    role: 'tool',
    content: JSON.stringify(contextData),
    createdAt: new Date(),
  };

  try {
    const savedMessage = await dbCreateMessage(newDrawingMessage);
    if (!savedMessage) {
      throw new Error('Failed to save drawing context message.');
    }
    return { success: true, messageId: savedMessage.id };
  } catch (error) {
    console.error('updateDrawingContext: Error saving drawing context message:', error);
    return { error: 'Failed to save drawing context message' };
  }
}

export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) return { error: 'User ID is required' }
  if (!prompt) return { error: 'Prompt is required' }

  try {
    await db.update(users)
      .set({ systemPrompt: prompt })
      .where(eq(users.id, userId));

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
    const result = await db.select({ systemPrompt: users.systemPrompt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0]?.systemPrompt || null;
  } catch (error) {
    console.error('getSystemPrompt: Error:', error)
    return null
  }
}

export async function deleteChat(id: string): Promise<boolean> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.error('deleteChat: User not authenticated.')
    return false
  }
  const success = await dbDeleteChat(id, userId)
  if (success) {
    revalidatePath('/')
  }
  return success
}

export async function updateChat(
  id: string,
  updates: { title?: string; visibility?: string }
): Promise<boolean> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.error('updateChat: User not authenticated.')
    return false
  }
  const success = await dbUpdateChat(id, userId, updates)
  if (success) {
    revalidatePath('/')
  }
  return success
}

export async function addParticipant(chatId: string, emailOrClerkId: string, role = 'collaborator'): Promise<boolean> {
  const currentUserId = await getCurrentUserIdOnServer()
  if (!currentUserId) return false

  // Verify current user is owner of the chat
  const [chat] = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, currentUserId))).limit(1)
  if (!chat) return false

  // Find target user by email or clerk ID
  const [targetUser] = await db.select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, emailOrClerkId), eq(users.clerkUserId, emailOrClerkId)))
    .limit(1)
  if (!targetUser) return false

  await db.insert(chatParticipants).values({
    chatId,
    userId: targetUser.id,
    role
  }).onConflictDoNothing()

  revalidatePath('/')
  return true
}

export async function removeParticipant(chatId: string, targetUserId: string): Promise<boolean> {
  const currentUserId = await getCurrentUserIdOnServer()
  if (!currentUserId) return false

  // Verify current user is owner of the chat
  const [chat] = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, currentUserId))).limit(1)
  if (!chat) return false

  await db.delete(chatParticipants)
    .where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, targetUserId)))

  revalidatePath('/')
  return true
}

export async function listParticipants(chatId: string): Promise<any[] | null> {
  const currentUserId = await getCurrentUserIdOnServer()
  if (!currentUserId) return null

  // Verify current user is owner or collaborator of the chat
  const [hasAccess] = await db.select()
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        sql`${chats.userId} = ${currentUserId} OR EXISTS (
          SELECT 1 FROM ${chatParticipants}
          WHERE ${chatParticipants.chatId} = ${chatId} AND ${chatParticipants.userId} = ${currentUserId}
        )`
      )
    )
    .limit(1)
  if (!hasAccess) return null

  const result = await db.select({
    id: chatParticipants.id,
    role: chatParticipants.role,
    userId: chatParticipants.userId,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    avatarUrl: users.avatarUrl
  })
  .from(chatParticipants)
  .innerJoin(users, eq(chatParticipants.userId, users.id))
  .where(eq(chatParticipants.chatId, chatId))

  return result
}
