import { researcher } from './researcher';
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { CoreMessage } from 'ai';

jest.mock('ai/rsc', () => ({
  createStreamableUI: jest.fn(),
  createStreamableValue: jest.fn()
}));

describe('researcher', () => {
  let uiStreamMock: ReturnType<typeof createStreamableUI>;
  let streamTextMock: ReturnType<typeof createStreamableValue<string>>;
  let messagesMock: CoreMessage[];

  beforeEach(() => {
    uiStreamMock = {
      update: jest.fn(),
      append: jest.fn()
    } as any;

    streamTextMock = {
      update: jest.fn(),
      value: '',
      done: jest.fn()
    } as any;

    messagesMock = [
      { role: 'user', content: 'What is the capital of France?' }
    ];
  });

  it('should handle successful research', async () => {
    const result = await researcher(uiStreamMock, streamTextMock, messagesMock);

    expect(result.fullResponse).toContain('Paris');
    expect(result.hasError).toBe(false);
    expect(result.toolResponses.length).toBeGreaterThan(0);
  });

  it('should handle error during research', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const result = await researcher(uiStreamMock, streamTextMock, messagesMock);

    expect(result.fullResponse).toContain('Error occurred while executing the tool');
    expect(result.hasError).toBe(true);
  });
});
