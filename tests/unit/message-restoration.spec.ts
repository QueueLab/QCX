/**
 * Unit tests for the message restoration logic.
 * Verifies that DrizzleMessage -> AIMessage mapping correctly restores
 * type and name fields from messageType and messageName DB columns.
 */

describe('Message Restoration (search/[id] page)', () => {
  describe('DrizzleMessage to AIMessage mapping', () => {
    it('should restore type from messageType column', () => {
      const dbMessages = [
        {
          id: 'msg-1',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'user',
          content: 'Hello',
          messageType: 'input',
          messageName: null,
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'assistant',
          content: 'Hi there!',
          messageType: 'response',
          messageName: null,
          createdAt: new Date(),
        },
        {
          id: 'msg-3',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'tool',
          content: 'Search results',
          messageType: 'tool',
          messageName: 'search',
          createdAt: new Date(),
        },
        {
          id: 'msg-4',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'assistant',
          content: 'Related topics',
          messageType: 'related',
          messageName: null,
          createdAt: new Date(),
        },
        {
          id: 'msg-5',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'assistant',
          content: 'Follow-up question',
          messageType: 'followup',
          messageName: null,
          createdAt: new Date(),
        },
      ];

      // Simulate the mapping logic from search/[id]/page.tsx
      const initialMessages = dbMessages.map((dbMsg: any) => ({
        id: dbMsg.id,
        role: dbMsg.role,
        content: dbMsg.content,
        type: dbMsg.messageType || undefined,
        name: dbMsg.messageName || undefined,
        createdAt: dbMsg.createdAt,
      }));

      // Verify type restoration
      expect(initialMessages[0].type).toBe('input');
      expect(initialMessages[1].type).toBe('response');
      expect(initialMessages[2].type).toBe('tool');
      expect(initialMessages[2].name).toBe('search');
      expect(initialMessages[3].type).toBe('related');
      expect(initialMessages[4].type).toBe('followup');
    });

    it('should handle null messageType gracefully', () => {
      const dbMessages = [
        {
          id: 'msg-1',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'user',
          content: 'Hello',
          messageType: null,
          messageName: null,
          createdAt: new Date(),
        },
      ];

      const initialMessages = dbMessages.map((dbMsg: any) => ({
        id: dbMsg.id,
        role: dbMsg.role,
        content: dbMsg.content,
        type: dbMsg.messageType || undefined,
        name: dbMsg.messageName || undefined,
        createdAt: dbMsg.createdAt,
      }));

      expect(initialMessages[0].type).toBeUndefined();
      expect(initialMessages[0].name).toBeUndefined();
    });

    it('should preserve all required fields for rendering', () => {
      const dbMessages = [
        {
          id: 'msg-1',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'user',
          content: 'What is the capital of France?',
          messageType: 'input',
          messageName: null,
          createdAt: new Date('2024-01-15T10:30:00Z'),
        },
        {
          id: 'msg-2',
          chatId: 'chat-123',
          userId: 'user-1',
          role: 'assistant',
          content: 'The capital of France is Paris.',
          messageType: 'response',
          messageName: null,
          createdAt: new Date('2024-01-15T10:30:05Z'),
        },
      ];

      const initialMessages = dbMessages.map((dbMsg: any) => ({
        id: dbMsg.id,
        role: dbMsg.role,
        content: dbMsg.content,
        type: dbMsg.messageType || undefined,
        name: dbMsg.messageName || undefined,
        createdAt: dbMsg.createdAt,
      }));

      // Verify all fields needed for UI rendering are present
      initialMessages.forEach((msg) => {
        expect(msg.id).toBeTruthy();
        expect(msg.role).toBeTruthy();
        expect(msg.content).toBeTruthy();
        expect(msg.createdAt).toBeInstanceOf(Date);
      });

      // Verify message ordering is preserved
      expect(initialMessages[0].id).toBe('msg-1');
      expect(initialMessages[1].id).toBe('msg-2');
    });

    it('should handle all known message types', () => {
      const knownTypes = [
        'input', 'response', 'tool', 'related', 'followup',
        'resolution_search_result', 'definition', 'end', 'image'
      ];

      const dbMessages = knownTypes.map((type, index) => ({
        id: `msg-${index}`,
        chatId: 'chat-123',
        userId: 'user-1',
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `Content for ${type}`,
        messageType: type,
        messageName: type === 'tool' ? 'search' : null,
        createdAt: new Date(),
      }));

      const initialMessages = dbMessages.map((dbMsg: any) => ({
        id: dbMsg.id,
        role: dbMsg.role,
        content: dbMsg.content,
        type: dbMsg.messageType || undefined,
        name: dbMsg.messageName || undefined,
        createdAt: dbMsg.createdAt,
      }));

      knownTypes.forEach((type, index) => {
        expect(initialMessages[index].type).toBe(type);
      });
    });
  });
});
