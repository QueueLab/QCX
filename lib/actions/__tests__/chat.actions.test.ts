// lib/actions/__tests__/chat.actions.test.ts
import { Redis } from '@upstash/redis';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Import the functions to be tested
import { startNewChat, clearChats } from '../chat'; // Import actual implementations

// Mock external dependencies
jest.mock('@upstash/redis', () => {
  const mockPipelineInstance = {
    del: jest.fn().mockReturnThis(),
    zrem: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(undefined),
    zrange: jest.fn(),
  };
  return {
    Redis: jest.fn(() => ({
      pipeline: jest.fn(() => mockPipelineInstance),
      zrange: mockPipelineInstance.zrange,
    })),
  };
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Chat Server Actions', () => {
  // Obtain the mocked Redis instance and its pipeline for assertions/mocking behavior
  // This relies on the mock constructor being called when chat.ts initializes its redis constant.
  // To get the specific instance used by chat.ts, we'd typically need to export it from chat.ts
  // or rely on the global mock being configured before chat.ts is imported.
  // For simplicity here, we'll call new Redis() to get a mocked instance
  // and assume the one in chat.ts gets the same mock setup.
  const mockRedisGlobalInstance = new Redis({ url: '', token: '' });
  const mockPipelineGlobalInstance = mockRedisGlobalInstance.pipeline();


  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Clear calls on the methods of the globally mocked Redis instance/pipeline
    (mockRedisGlobalInstance.zrange as jest.Mock).mockClear();
    (mockPipelineGlobalInstance.del as jest.Mock).mockClear();
    (mockPipelineGlobalInstance.zrem as jest.Mock).mockClear();
    (mockPipelineGlobalInstance.exec as jest.Mock).mockClear();
  });

  describe('startNewChat', () => {
    it('should ultimately lead to revalidation and redirect, by calling clearChats (simulating no chats)', async () => {
      // Simulate that clearChats (when called) will find no chats in Redis
      (mockRedisGlobalInstance.zrange as jest.Mock).mockResolvedValue([]);

      await startNewChat(); // This will call the actual clearChats, which uses the mocked Redis

      // Verify that clearChats (when called by startNewChat) resulted in these actions
      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(redirect).toHaveBeenCalledTimes(1);
      expect(redirect).toHaveBeenCalledWith('/');

      // Verify that zrange was called by clearChats (with any arguments, as it's an indirect effect)
      expect(mockRedisGlobalInstance.zrange).toHaveBeenCalledTimes(1);
    });

    it('should ultimately lead to revalidation and redirect, by calling clearChats (simulating existing chats)', async () => {
      // Simulate that clearChats (when called) will find some chats
      const fakeChats = ['chat:id1', 'chat:id2'];
      (mockRedisGlobalInstance.zrange as jest.Mock).mockResolvedValue(fakeChats);
      (mockPipelineGlobalInstance.exec as jest.Mock).mockResolvedValue(undefined); // For the deletion pipeline

      await startNewChat();

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(redirect).toHaveBeenCalledTimes(1);
      expect(mockRedisGlobalInstance.zrange).toHaveBeenCalledTimes(1);
      expect(mockPipelineGlobalInstance.del).toHaveBeenCalledTimes(fakeChats.length);
      expect(mockPipelineGlobalInstance.zrem).toHaveBeenCalledTimes(fakeChats.length);
      expect(mockPipelineGlobalInstance.exec).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearChats (actual implementation)', () => {
    it('should call revalidatePath and redirect even if no chats exist', async () => {
      (mockRedisGlobalInstance.zrange as jest.Mock).mockResolvedValue([]);

      await clearChats('test-user-no-chats'); // Call the actual clearChats

      expect(mockRedisGlobalInstance.zrange).toHaveBeenCalledWith('user:chat:test-user-no-chats', 0, -1);
      expect(mockPipelineGlobalInstance.del).not.toHaveBeenCalled();
      expect(mockPipelineGlobalInstance.zrem).not.toHaveBeenCalled();
      // pipeline.exec should not be called if there are no chats to delete, as pipeline isn't used for del/zrem.
      // The current code structure for clearChats:
      // if (chats.length) { pipeline = redis.pipeline(); ... pipeline.exec() }
      // So, if chats.length is 0, pipeline.exec() is not called.
      expect(mockPipelineGlobalInstance.exec).not.toHaveBeenCalled();

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(redirect).toHaveBeenCalledTimes(1);
      expect(redirect).toHaveBeenCalledWith('/');
    });

    it('should delete chats if they exist and then revalidate and redirect', async () => {
      const fakeChats = ['chat:1', 'chat:2'];
      (mockRedisGlobalInstance.zrange as jest.Mock).mockResolvedValue(fakeChats);
      (mockPipelineGlobalInstance.exec as jest.Mock).mockResolvedValue(undefined);

      await clearChats('test-user-with-chats');

      expect(mockRedisGlobalInstance.zrange).toHaveBeenCalledWith('user:chat:test-user-with-chats', 0, -1);
      expect(mockPipelineGlobalInstance.del).toHaveBeenCalledTimes(fakeChats.length);
      expect(mockPipelineGlobalInstance.del).toHaveBeenCalledWith('chat:1');
      expect(mockPipelineGlobalInstance.del).toHaveBeenCalledWith('chat:2');
      expect(mockPipelineGlobalInstance.zrem).toHaveBeenCalledTimes(fakeChats.length);
      expect(mockPipelineGlobalInstance.zrem).toHaveBeenCalledWith('user:chat:test-user-with-chats', 'chat:1');
      expect(mockPipelineGlobalInstance.zrem).toHaveBeenCalledWith('user:chat:test-user-with-chats', 'chat:2');
      expect(mockPipelineGlobalInstance.exec).toHaveBeenCalledTimes(1);

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(redirect).toHaveBeenCalledTimes(1);
    });
  });
});
