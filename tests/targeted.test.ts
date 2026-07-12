import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { users, chats, messages, calendarNotes } from "@/lib/db/schema";
import { saveChat, getChatMessages } from "@/lib/actions/chat";
import { getNotes, saveNote } from "@/lib/actions/calendar";
import { getUIStateFromAIState, AIState } from "@/app/actions";
import { eq } from "drizzle-orm";

// Mock auth helper since we don't have session auth here
import * as auth from "@/lib/auth/get-current-user";
const dummyUserId = "11111111-1111-1111-1111-111111111111";

// Mock getCurrentUserIdOnServer
const originalGetCurrentUserIdOnServer = auth.getCurrentUserIdOnServer;
auth.getCurrentUserIdOnServer = async () => dummyUserId;

describe("Targeted QCX Persistence and Rehydration Tests", () => {
  beforeAll(async () => {
    // Ensure our dummy user exists in the local database
    await db.insert(users).values({
      id: dummyUserId,
      email: "targeted-test-user@qcx.test",
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up
    await db.delete(calendarNotes).where(eq(calendarNotes.userId, dummyUserId));
    await db.delete(messages).where(eq(messages.userId, dummyUserId));
    await db.delete(chats).where(eq(chats.userId, dummyUserId));
    await db.delete(users).where(eq(users.id, dummyUserId));
  });

  test("Message type and name persistence in saveChat", async () => {
    const dummyChatId = "22222222-2222-2222-2222-222222222222";
    const chatData = {
      id: dummyChatId,
      title: "Test Chat",
      createdAt: new Date(),
      userId: dummyUserId,
      path: `/search/${dummyChatId}`,
      messages: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          role: "assistant" as const,
          content: "Hello! This is a test response.",
          type: "response" as const,
          name: "TestBot",
          userId: dummyUserId,
          createdAt: new Date(),
        },
        {
          id: "44444444-4444-4444-4444-444444444444",
          role: "assistant" as const,
          content: "end",
          type: "end" as const,
          userId: dummyUserId,
          createdAt: new Date(),
        }
      ]
    };

    // Save the chat (filtering of synthetic 'end' message should happen in actions.tsx,
    // but saveChat itself maps type/name columns correctly)
    const savedChatId = await saveChat(chatData, dummyUserId);
    expect(savedChatId).toBe(dummyChatId);

    // Rehydrate messages and verify fields
    const dbMsgs = await getChatMessages(dummyChatId);
    expect(dbMsgs.length).toBe(2);

    const mainMsg = dbMsgs.find(m => m.id === "33333333-3333-3333-3333-333333333333");
    expect(mainMsg).toBeDefined();
    expect(mainMsg?.type).toBe("response");
    expect(mainMsg?.name).toBe("TestBot");

    const endMsg = dbMsgs.find(m => m.id === "44444444-4444-4444-4444-444444444444");
    expect(endMsg).toBeDefined();
    expect(endMsg?.type).toBe("end");
  });

  test("Calendar notes date-range retrieval using Drizzle comparators", async () => {
    const dummyChatId = "55555555-5555-5555-5555-555555555555";
    await db.insert(chats).values({
      id: dummyChatId,
      userId: dummyUserId,
      title: "Calendar Test Chat",
    }).onConflictDoNothing();

    // Create note on a specific date
    const noteDate = new Date("2026-05-15T12:00:00Z");
    const note = await saveNote({
      userId: dummyUserId,
      chatId: dummyChatId,
      date: noteDate,
      content: "Important calendar note",
      locationTags: null,
      userTags: null,
      mapFeatureId: null,
    });
    expect(note).toBeDefined();
    expect(note?.id).toBeDefined();

    // Fetch notes for the exact day
    const fetchedNotes = await getNotes(new Date("2026-05-15T00:00:00Z"), dummyChatId);
    expect(fetchedNotes.length).toBe(1);
    expect(fetchedNotes[0].content).toBe("Important calendar note");

    // Fetch notes for a different day (should be empty)
    const emptyNotes = await getNotes(new Date("2026-05-16T00:00:00Z"), dummyChatId);
    expect(emptyNotes.length).toBe(0);
  });

  test("getUIStateFromAIState filters correctly and has fallbacks", () => {
    const aiState: AIState = {
      chatId: "test-chat-id",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "hello",
          type: "input",
        },
        {
          id: "msg-2",
          role: "user",
          content: "invalid-type-msg",
          type: "unrecognized_type" as any, // Unrecognized type, should return null
        },
        {
          id: "msg-3",
          role: "assistant",
          content: "end",
          type: "end", // Synthetic end, should be filtered/null
        }
      ]
    };

    const uiState = getUIStateFromAIState(aiState);
    // Unrecognized user type should fall back to return null and be dropped.
    // Synthetic end message should also return null and be dropped.
    // Only 'msg-1' should remain in the returned uiState list.
    expect(uiState.length).toBe(1);
    expect(uiState[0].id).toBe("msg-1");
  });
});
