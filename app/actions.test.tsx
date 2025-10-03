import { vi, describe, it, expect, beforeEach } from 'vitest';
import { submit, clearChat, getUIStateFromAIState, AI } from './actions';
import { nanoid } from 'nanoid';

// Mock dependencies
vi.mock('ai/rsc', async (importOriginal) => {
    const original = await importOriginal();
    const mockState = {
        messages: [],
        chatId: 'test-chat-id',
    };
    return {
        ...original,
        createAI: vi.fn(() => ({})),
        getMutableAIState: vi.fn(() => ({
            get: vi.fn(() => mockState),
            update: vi.fn(),
            done: vi.fn(),
        })),
        getAIState: vi.fn(() => mockState),
        createStreamableUI: vi.fn(() => ({
            value: null,
            append: vi.fn(),
            update: vi.fn(),
            done: vi.fn(),
        })),
        createStreamableValue: vi.fn((initial) => ({
            value: initial,
            update: vi.fn(),
            done: vi.fn(),
        })),
    };
});

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id'),
}));

vi.mock('@/lib/agents', () => ({
    inquire: vi.fn(),
    researcher: vi.fn(() => Promise.resolve({ fullResponse: 'Research result', hasError: false, toolResponses: [] })),
    taskManager: vi.fn(() => Promise.resolve({ object: { next: 'proceed' } })),
    querySuggestor: vi.fn(() => Promise.resolve({ items: [{ query: 'Related query' }] })),
    writer: vi.fn(),
}));

vi.mock('@/lib/actions/chat', () => ({
    saveChat: vi.fn(),
    getSystemPrompt: vi.fn(() => Promise.resolve('System prompt')),
}));

vi.mock('@/lib/auth/get-current-user', () => ({
    getCurrentUserIdOnServer: vi.fn(() => Promise.resolve('test-user-id')),
}));

// Mock UI Components to avoid rendering errors in tests
vi.mock('@/components/user-message', () => ({ UserMessage: () => <div>UserMessage</div> }));
vi.mock('@/components/message', () => ({ BotMessage: () => <div>BotMessage</div> }));
vi.mock('@/components/section', () => ({ Section: ({ children }) => <div>{children}</div> }));
vi.mock('@/components/search-related', () => ({ default: () => <div>SearchRelated</div> }));
vi.mock('@/components/followup-panel', () => ({ FollowupPanel: () => <div>FollowupPanel</div> }));
vi.mock('@/components/map/map-query-handler', () => ({ MapQueryHandler: () => <div>MapQueryHandler</div> }));
vi.mock('@/components/search-section', () => ({ SearchSection: () => <div>SearchSection</div> }));
vi.mock('@/components/retrieve-section', () => ({ default: () => <div>RetrieveSection</div> }));
vi.mock('@/components/video-search-section', () => ({ VideoSearchSection: () => <div>VideoSearchSection</div> }));
vi.mock('@/components/copilot-display', () => ({ CopilotDisplay: () => <div>CopilotDisplay</div> }));


describe('Chat Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('submit action', () => {
        it('should handle the "what is a planet computer?" special case', async () => {
            const formData = new FormData();
            formData.append('input', 'what is a planet computer?');

            const result = await submit(formData);

            expect(result.id).toBe('test-id');
            // We can't easily test the content of the streamable UI without more complex setup,
            // but we can check that the function returns and doesn't throw an error.
            expect(result.component).toBeDefined();
        });

        it('should return early if no input is provided', async () => {
            const formData = new FormData();
            const result = await submit(formData);

            expect(result.id).toBe('test-id');
            expect(result.component).toBeNull();
        });
    });

    describe('getUIStateFromAIState', () => {
        it('should correctly transform a user message', () => {
            const aiState = {
                chatId: 'chat123',
                messages: [
                    {
                        id: 'msg1',
                        role: 'user',
                        content: '{"input": "Hello"}',
                        type: 'input',
                    },
                ],
            };
            const uiState = getUIStateFromAIState(aiState);
            expect(uiState).toHaveLength(1);
            expect(uiState[0].id).toBe('msg1');
            expect(uiState[0].component).toBeDefined();
        });

        it('should correctly transform an assistant response', () => {
            const aiState = {
                chatId: 'chat123',
                messages: [
                    {
                        id: 'msg2',
                        role: 'assistant',
                        content: 'This is a response.',
                        type: 'response',
                    },
                ],
            };
            const uiState = getUIStateFromAIState(aiState);
            expect(uiState).toHaveLength(1);
            expect(uiState[0].id).toBe('msg2');
            expect(uiState[0].component).toBeDefined();
        });

        it('should return an empty array for messages with no type', () => {
            const aiState = {
                chatId: 'chat123',
                messages: [
                    {
                        id: 'msg3',
                        role: 'user',
                        content: 'no type here',
                    },
                ],
            };
            const uiState = getUIStateFromAIState(aiState);
            expect(uiState).toHaveLength(0);
        });
    });
});