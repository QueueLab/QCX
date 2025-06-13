'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type Chat, type AIMessage } from '@/lib/types' // Added AIMessage
import { Redis } from '@upstash/redis'
// NOTE: nanoid is not used in this file, consider adding for truly unique IDs if that's a project pattern.
// For now, Date.now().toString() will be used for message IDs within updateDrawingContext.

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const pipeline = redis.pipeline()
    const chats: string[] = await redis.zrange(`user:chat:${userId}`, 0, -1, {
      rev: true
    })

    for (const chat of chats) {
      pipeline.hgetall(chat)
    }

    const results = await pipeline.exec()

    return results.filter(chat => chat !== null) as Chat[]
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string = 'anonymous') {
  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat) {
    return null
  }

  return chat
}

export async function clearChats(
  userId: string = 'anonymous'
): Promise<{ error?: string }> {
  const chats: string[] = await redis.zrange(`user:chat:${userId}`, 0, -1)
  if (!chats.length) {
    return { error: 'No chats to clear' }
  }
  const pipeline = redis.pipeline()

  for (const chat of chats) {
    pipeline.del(chat)
    pipeline.zrem(`user:chat:${userId}`, chat)
  }

  await pipeline.exec()

  revalidatePath('/')
  redirect('/')
}

export async function saveChat(chat: Chat) {
  const pipeline = redis.pipeline()
  pipeline.hmset(`chat:${chat.id}`, chat)
  pipeline.zadd(`user:chat:${chat.userId}`, {
    score: Date.now(),
    member: `chat:${chat.id}`
  })
  await pipeline.exec()
}

export async function getSharedChat(id: string) {
  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string, userId: string = 'anonymous') {
  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat) {
    return null
  }

  const payload = {
    ...chat,
    sharePath: `/share/${id}`
  }

  await redis.hmset(`chat:${id}`, payload)

  return payload
}

export async function updateDrawingContext(chatId: string, drawnFeatures: any[]) {
  'use server';
  console.log('[Action] updateDrawingContext called for chatId:', chatId);

  const chat = await getChat(chatId); // Assuming getChat can be called without userId for internal server actions
  if (!chat) {
    console.error('updateDrawingContext: Chat not found for id:', chatId);
    return { error: 'Chat not found' };
  }

  // Ensure chat.userId exists, as saveChat expects it.
  // getChat currently defaults userId to 'anonymous' but that's for retrieval,
  // the actual chat object should have the original userId.
  const userId = chat.userId;
  if (!userId) {
    console.error('updateDrawingContext: userId not found in chat object for chatId:', chatId);
    return { error: 'User ID not found in chat' };
  }

  // Generate a new message ID (placeholder, consider using nanoid or similar for production)
  const messageId = `drawnData-${Date.now().toString()}`;

  const newDrawingMessage: AIMessage = {
    id: messageId,
    role: 'data', // Using 'data' role for this system message
    content: JSON.stringify(drawnFeatures), // Store features as stringified JSON
    type: 'drawing_context', // Custom type for easy identification/filtering later
    // name: 'drawing_update', // Optional: if you want to provide a name for the data event
    createdAt: new Date(), // Optional: Add a timestamp for the message
  };

  const updatedMessages = [...chat.messages, newDrawingMessage];
  const updatedChat: Chat = { ...chat, messages: updatedMessages };

  try {
    await saveChat(updatedChat);
    console.log('Drawing context message added to chat:', chatId);
    // Optionally, revalidate relevant paths if this change should immediately reflect elsewhere
    // revalidatePath(`/search/${chatId}`);
    return { success: true, messageId: newDrawingMessage.id };
  } catch (error) {
    console.error('updateDrawingContext: Error saving chat:', error);
    return { error: 'Failed to save updated chat' };
  }
}

export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) {
    return { error: 'User ID is required' }
  }

  if (!prompt) {
    return { error: 'Prompt is required' }
  }

  try {
    await redis.set(`system_prompt:${userId}`, prompt)
    return { success: true }
  } catch (error) {
    console.error('saveSystemPrompt: Error saving system prompt:', error)
    return { error: 'Failed to save system prompt' }
  }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  if (!userId) {
    console.error('getSystemPrompt: User ID is required')
    return null
  }

  try {
    const prompt = await redis.get<string>(`system_prompt:${userId}`)
    return prompt
  } catch (error) {
    console.error('getSystemPrompt: Error retrieving system prompt:', error)
    return null
  }
}
