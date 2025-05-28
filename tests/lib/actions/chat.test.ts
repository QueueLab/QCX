import { shareChat } from '@/lib/actions/chat';
import { Redis } from '@upstash/redis';
import type { Chat } from '@/lib/types';

// Mock the Redis client
jest.mock('@upstash/redis', () => {
  const mRedis = {
    hgetall: jest.fn(),
    hmset: jest.fn(),
  };
  return {
    Redis: jest.fn(() => mRedis),
  };
});

describe('shareChat', () => {
  let redis: ReturnType<typeof Redis>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Get a new instance of the mocked redis for each test
    redis = new Redis({ url: '', token: '' });
  });

  it('should allow a user to share a chat they do not own', async () => {
    // Arrange
    const chatId = 'chat1';
    const originalUserId = 'userA';
    const sharingUserId = 'userB'; // Different user
    const sampleChat: Chat = {
      id: chatId,
      userId: originalUserId,
      messages: [],
      title: 'Test Chat',
      createdAt: new Date(),
      path: `/chat/${chatId}`,
    };

    (redis.hgetall as jest.Mock).mockResolvedValue(sampleChat);
    (redis.hmset as jest.Mock).mockResolvedValue({} as never); // Mock hmset to resolve

    // Act
    const result = await shareChat(chatId, sharingUserId);

    // Assert
    expect(redis.hgetall).toHaveBeenCalledTimes(1);
    expect(redis.hgetall).toHaveBeenCalledWith(`chat:${chatId}`);

    const expectedPayload = {
      ...sampleChat,
      sharePath: `/share/${chatId}`,
    };
    expect(redis.hmset).toHaveBeenCalledTimes(1);
    expect(redis.hmset).toHaveBeenCalledWith(`chat:${chatId}`, expectedPayload);

    expect(result).toEqual(expectedPayload);
  });

  it('should return null if the chat does not exist', async () => {
    // Arrange
    const chatId = 'nonexistentchat';
    const sharingUserId = 'userC';

    (redis.hgetall as jest.Mock).mockResolvedValue(null); // Simulate chat not found

    // Act
    const result = await shareChat(chatId, sharingUserId);

    // Assert
    expect(redis.hgetall).toHaveBeenCalledTimes(1);
    expect(redis.hgetall).toHaveBeenCalledWith(`chat:${chatId}`);
    expect(redis.hmset).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
