'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  getChat as getChatFromDb,
  getChatsPage as getChatsPageFromDb,
  saveChat as saveChatInDb,
  deleteChat as deleteChatFromDb,
  clearHistory as clearHistoryInDb,
  NewChat,
  NewMessage
} from './chat-db'
import { type Chat } from '@/lib/types'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }
  const { chats } = await getChatsPageFromDb(userId)
  return chats
}

export async function getChatsPage(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  return getChatsPageFromDb(userId, limit, offset)
}

export async function getChat(id: string, userId: string) {
  const chat = await getChatFromDb(id, userId)
  if (!chat) {
    return null
  }
  // The chat from the db needs to be converted to the `Chat` type expected by the application
  // This is a placeholder for the actual conversion logic
  return chat as Chat
}

export async function clearChats(
  userId: string
): Promise<{ error?: string }> {
  const success = await clearHistoryInDb(userId)
  if (!success) {
    return { error: 'Failed to clear chats' }
  }
  revalidatePath('/')
  redirect('/')
  return {}
}

export async function deleteChat(
  chatId: string,
  userId: string
): Promise<{ error?: string }> {
  const success = await deleteChatFromDb(chatId, userId)
  if (!success) {
    return { error: 'Failed to delete chat' }
  }
  revalidatePath('/')
  return {}
}

export async function saveChat(chat: Chat, userId: string) {
  const { id, title, createdAt, path, messages, sharePath } = chat

  const chatData: NewChat = {
    id,
    title,
    userId,
    createdAt,
    path,
    sharePath,
    // visibility is not in the morphic-reasoning Chat type, so we'll need to decide on a default
    visibility: 'private',
  };

  const messagesData: Omit<NewMessage, 'chatId'>[] = messages.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role,
    createdAt: msg.createdAt,
    userId,
  }));

  const savedChatId = await saveChatInDb(chatData, messagesData);
  if (!savedChatId) {
    throw new Error('Failed to save chat')
  }
  return savedChatId
}

export async function getSharedChat(id: string) {
  // Assuming public chats are shared chats.
  // The original morphic-reasoning logic checked for a `sharePath`.
  // We are adapting to the Planet QCX schema which has a `visibility` field.
  const chat = await getChatFromDb(id, '') // passing empty userId to fetch public chat
  if (!chat || chat.visibility !== 'public') {
    return null
  }
  return chat as Chat
}

export async function shareChat(id: string, userId: string) {
  // This function in morphic-reasoning added a `sharePath`.
  // In Planet QCX, this could be implemented by changing the chat's visibility to 'public'.
  // For now, this is a placeholder implementation.
  const chat = await getChatFromDb(id, userId)
  if (!chat) {
    return null
  }
  // Here you would update the chat's visibility to 'public' in the database.
  // This functionality is not yet implemented in chat-db.ts.
  // For now, we'll just return the chat.
  return chat as Chat
}
