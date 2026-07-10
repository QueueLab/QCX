/**
 * Unit tests for chat-db.ts functions.
 * These test the save/retrieve logic including messageType and messageName persistence.
 * Run with: npx vitest run tests/unit/chat-db.spec.ts
 */

// Mock the database module
const mockDbTransaction = jest.fn();
const mockDbDelete = jest.fn();
const mockDbSelect = jest.fn();
const mockDbInsert = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    transaction: (...args: any[]) => mockDbTransaction(...args),
    delete: jest.fn(() => ({
      where: jest.fn(() => mockDbDelete()),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => mockDbSelect()),
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => mockDbSelect()),
          })),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => mockDbInsert()),
        onConflictDoUpdate: jest.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

jest.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUserIdOnServer: jest.fn().mockResolvedValue('test-user-uuid'),
}));

import { clearHistory, saveChat, getMessagesByChatId } from '@/lib/actions/chat-db';

describe('chat-db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clearHistory', () => {
    it('should delete all chats for the user', async () => {
      mockDbDelete.mockResolvedValue(undefined);
      const result = await clearHistory('test-user-uuid');
      expect(result).toBe(true);
    });

    it('should return false when userId is missing', async () => {
      const result = await clearHistory('');
      expect(result).toBe(false);
    });

    it('should retry on failure', async () => {
      let callCount = 0;
      mockDbDelete.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Connection timeout');
        }
        return Promise.resolve(undefined);
      });
      const result = await clearHistory('test-user-uuid');
      expect(result).toBe(true);
      expect(callCount).toBe(2);
    });

    it('should return false after max retries exhausted', async () => {
      mockDbDelete.mockRejectedValue(new Error('Connection refused'));
      const result = await clearHistory('test-user-uuid');
      expect(result).toBe(false);
    });
  });

  describe('saveChat', () => {
    it('should return null when chatData has no userId', async () => {
      const result = await saveChat(
        { userId: undefined as any, title: 'Test' },
        []
      );
      expect(result).toBe(null);
    });

    it('should persist messageType and messageName fields', async () => {
      mockDbTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          select: jest.fn().mockResolvedValue([]),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'new-chat-id' }]),
            }),
          }),
        };
        return fn(mockTx);
      });

      const messagesWithTypes = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          messageType: 'input',
          messageName: null,
          userId: 'test-user-uuid',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there',
          messageType: 'response',
          messageName: null,
          userId: 'test-user-uuid',
        },
        {
          id: 'msg-3',
          role: 'tool',
          content: 'Search results',
          messageType: 'tool',
          messageName: 'search',
          userId: 'test-user-uuid',
        },
      ];

      const result = await saveChat(
        { id: 'chat-123', userId: 'test-user-uuid', title: 'Test Chat' },
        messagesWithTypes as any
      );

      expect(result).toBe('chat-123');
    });
  });

  describe('getMessagesByChatId', () => {
    it('should return messages with messageType and messageName', async () => {
      mockDbSelect.mockResolvedValue([
        {
          id: 'msg-1',
          chatId: 'chat-123',
          userId: 'test-user-uuid',
          role: 'user',
          content: 'Hello',
          messageType: 'input',
          messageName: null,
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          chatId: 'chat-123',
          userId: 'test-user-uuid',
          role: 'assistant',
          content: 'Hi there',
          messageType: 'response',
          messageName: null,
          createdAt: new Date(),
        },
      ]);

      const messages = await getMessagesByChatId('chat-123');
      expect(messages).toHaveLength(2);
      expect(messages[0].messageType).toBe('input');
      expect(messages[1].messageType).toBe('response');
    });

    it('should return empty array when chatId is missing', async () => {
      const messages = await getMessagesByChatId('');
      expect(messages).toEqual([]);
    });
  });
});
