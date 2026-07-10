/**
 * Unit tests for chat.ts saveChat function.
 * Tests that the AIMessage -> DbNewMessage mapping correctly preserves
 * type and name fields.
 */

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ id: 'test-user-uuid' }]),
        }),
      }),
    }),
  },
}));

jest.mock('@/lib/actions/chat-db', () => ({
  getChatsPage: jest.fn().mockResolvedValue({ chats: [], nextOffset: null }),
  getChat: jest.fn().mockResolvedValue(null),
  clearHistory: jest.fn().mockResolvedValue(true),
  saveChat: jest.fn().mockResolvedValue('saved-chat-id'),
  createMessage: jest.fn(),
  getMessagesByChatId: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUserIdOnServer: jest.fn().mockResolvedValue('test-user-uuid'),
}));

jest.mock('../utils', () => ({
  getModel: jest.fn(),
  normalizeMessageContent: jest.fn((content) =>
    typeof content === 'string' ? content : JSON.stringify(content)
  ),
}));

jest.mock('../agents/report/executive-summary', () => ({
  executiveSummaryAgent: jest.fn(),
}));

jest.mock('../agents/report/strategic-synthesis', () => ({
  strategicSynthesisAgent: jest.fn(),
}));

import { saveChat } from '@/lib/actions/chat';
import { saveChat as dbSaveChat } from '@/lib/actions/chat-db';

describe('chat.ts saveChat mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should map type field to messageType in DB messages', async () => {
    const chat = {
      id: 'chat-123',
      createdAt: new Date(),
      userId: 'test-user-uuid',
      path: '/search/chat-123',
      title: 'Test Chat',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello world',
          type: 'input',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          type: 'response',
          createdAt: new Date(),
        },
        {
          id: 'msg-3',
          role: 'tool',
          content: 'Search results',
          type: 'tool',
          name: 'search',
          createdAt: new Date(),
        },
      ],
    };

    await saveChat(chat, 'test-user-uuid');

    // Verify dbSaveChat was called
    expect(dbSaveChat).toHaveBeenCalled();
    const callArgs = (dbSaveChat as jest.Mock).mock.calls[0];
    const messagesData = callArgs[1]; // Second argument is messages

    // Verify messageType was mapped correctly
    expect(messagesData[0].messageType).toBe('input');
    expect(messagesData[1].messageType).toBe('response');
    expect(messagesData[2].messageType).toBe('tool');
    expect(messagesData[2].messageName).toBe('search');
  });

  it('should handle messages without type field (null)', async () => {
    const chat = {
      id: 'chat-456',
      createdAt: new Date(),
      userId: 'test-user-uuid',
      path: '/search/chat-456',
      title: 'Test Chat 2',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          // No type field
          createdAt: new Date(),
        },
      ],
    };

    await saveChat(chat, 'test-user-uuid');

    const callArgs = (dbSaveChat as jest.Mock).mock.calls[0];
    const messagesData = callArgs[1];
    expect(messagesData[0].messageType).toBeNull();
  });

  it('should handle object content (JSON.stringify)', async () => {
    const chat = {
      id: 'chat-789',
      createdAt: new Date(),
      userId: 'test-user-uuid',
      path: '/search/chat-789',
      title: 'Test Chat 3',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          type: 'input',
          createdAt: new Date(),
        },
      ],
    };

    await saveChat(chat, 'test-user-uuid');

    const callArgs = (dbSaveChat as jest.Mock).mock.calls[0];
    const messagesData = callArgs[1];
    expect(messagesData[0].content).toBe('[{"type":"text","text":"Hello"}]');
  });
});
