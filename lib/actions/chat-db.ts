import { db } from '@/lib/db';
import { chats, messages, users, chatParticipants } from '@/lib/db/schema';
import { eq, desc, and, sql, asc, or, exists } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;

export async function getChat(id: string, userId: string): Promise<Chat | null> {
  if (!userId) {
    const result = await db.select().from(chats).where(and(eq(chats.id, id), eq(chats.visibility, 'public'))).limit(1);
    return result[0] || null;
  }

  const result = await db.select()
    .from(chats)
    .where(
      and(
        eq(chats.id, id),
        or(
          eq(chats.visibility, 'public'),
          exists(
            db.select().from(chatParticipants)
              .where(and(
                eq(chatParticipants.chatId, id),
                eq(chatParticipants.userId, userId)
              ))
          )
        )
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function getChatsPage(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  if (!userId) {
    return { chats: [], nextOffset: null };
  }

  const result = await db
    .select({
      id: chats.id,
      userId: chats.userId,
      title: chats.title,
      visibility: chats.visibility,
      path: chats.path,
      sharePath: chats.sharePath,
      shareableLinkId: chats.shareableLinkId,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
    .where(eq(chatParticipants.userId, userId))
    .orderBy(desc(chats.createdAt))
    .limit(limit)
    .offset(offset);

  let nextOffset: number | null = null;
  if (result.length === limit) {
    nextOffset = offset + limit;
  }

  return { chats: result as Chat[], nextOffset };
}

export async function saveChat(chatData: NewChat, messagesData: Omit<NewMessage, 'chatId'>[]): Promise<string | null> {
  if (!chatData.userId) {
    return null;
  }

  return db.transaction(async (tx) => {
    let chatId = chatData.id;

    if (chatId) {
      const existingChat = await tx.select({ id: chats.id }).from(chats).where(eq(chats.id, chatId)).limit(1);
      if (!existingChat.length) {
        const newChatResult = await tx.insert(chats).values(chatData).returning({ id: chats.id });
        chatId = newChatResult[0].id;
        // Auto-add owner as participant
        await tx.insert(chatParticipants).values({
            chatId: chatId,
            userId: chatData.userId!,
            role: 'owner'
        });
      } else {
        if (chatData.title) {
          await tx.update(chats).set({
            title: chatData.title,
            visibility: chatData.visibility,
            updatedAt: chatData.updatedAt || new Date()
          }).where(eq(chats.id, chatId));
        }
      }
    } else {
      const newChatResult = await tx.insert(chats).values(chatData).returning({ id: chats.id });
      chatId = newChatResult[0].id;
      await tx.insert(chatParticipants).values({
          chatId: chatId,
          userId: chatData.userId!,
          role: 'owner'
      });
    }

    if (!chatId) {
      throw new Error('Failed to establish chatId for chat operation.');
    }

    if (messagesData && messagesData.length > 0) {
      const messagesToInsert = messagesData.map(msg => ({
        ...msg,
        chatId: chatId!,
        userId: msg.userId || chatData.userId!,
      }));
      await tx.insert(messages).values(messagesToInsert).onConflictDoUpdate({
          target: messages.id,
          set: { content: sql`EXCLUDED.content`, role: sql`EXCLUDED.role` }
      });
    }
    return chatId;
  });
}

export async function createMessage(messageData: NewMessage): Promise<Message | null> {
  if (!messageData.chatId || !messageData.userId || !messageData.role || !messageData.content) {
    return null;
  }
  try {
    const result = await db.insert(messages).values(messageData).returning();
    return result[0] || null;
  } catch (error) {
    console.error('Error creating message:', error);
    return null;
  }
}

export async function deleteChat(id: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const result = await db
      .delete(chats)
      .where(and(
          eq(chats.id, id),
          eq(chats.userId, userId) // Only owner can delete
      ))
      .returning({ id: chats.id });
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
}

export async function clearHistory(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    await db.delete(chats).where(eq(chats.userId, userId));
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
}

export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
  if (!chatId) return [];
  try {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));
    return result;
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
    return [];
  }
}
