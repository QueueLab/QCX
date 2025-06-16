import { researcher } from './researcher';
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
// Import 'ai' to access its members for mocking
import * as ai from 'ai';

// Mock the streamable UI and value functions
jest.mock('ai/rsc', () => ({
  createStreamableUI: jest.fn(() => ({
    update: jest.fn(),
    append: jest.fn(),
    done: jest.fn(),
  })),
  createStreamableValue: jest.fn(() => ({
    update: jest.fn(),
    done: jest.fn(),
    value: '',
  })),
}));

// Mock getModel and getTools
jest.mock('../utils', () => ({
  getModel: jest.fn(() => 'mock-model'),
}));

jest.mock('./tools', () => ({
  getTools: jest.fn(() => ({})),
}));

// Mock 'ai' module, specifically nonexperimental_streamText
const mockStreamTextFn = jest.fn().mockResolvedValue({
  fullStream: (async function* () {
    yield { type: 'text-delta', textDelta: 'initial response part' };
    // Simulate more parts of the stream if necessary for comprehensive testing
  })(),
  // ensure other expected properties on the resolved object are present
  // e.g. text: Promise.resolve("initial response part") if that's used
});

jest.mock('ai', (): typeof ai => {
  const originalModule = jest.requireActual('ai');
  return {
    ...originalModule,
    // Cast is okay here because we are replacing it with a Jest mock
    // that is compatible for the purpose of this test.
    nonexperimental_streamText: mockStreamTextFn as any,
  };
});

describe('researcher agent', () => {
  let mockUiStream: ReturnType<typeof createStreamableUI>;
  let mockStreamTextValue: ReturnType<typeof createStreamableValue>;
  const originalDate = Date;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockUiStream = createStreamableUI();
    mockStreamTextValue = createStreamableValue();

    // Mock Date
    // Target: "YYYY-MM-DD HH:MM:SS" -> "2024-01-15 10:30:45"
    // Need to account for timezone differences if the formatting logic in researcher.tsx uses local time.
    // The provided MOCK_DATE is UTC. If getFullYear, getMonth etc. are called on it,
    // they will correspond to UTC values.
    const MOCK_DATE_UTC = '2024-01-15T10:30:45.000Z';
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length) {
          // @ts-ignore
          return new originalDate(...args);
        }
        return new originalDate(MOCK_DATE_UTC);
      }

      static now() {
        return new originalDate(MOCK_DATE_UTC).getTime();
      }
      // Add other static Date methods if your code uses them e.g. Date.parse()

      //getFullYear, getMonth, etc. will be called on this Date instance
      // Ensure they return values consistent with the desired "YYYY-MM-DD HH:MM:SS" output
      // For MOCK_DATE_UTC = '2024-01-15T10:30:45.000Z'
      // getFullYear() -> 2024
      // getMonth() -> 0 (January)
      // getDate() -> 15
      // getHours() -> 10 (if UTC)
      // getMinutes() -> 30
      // getSeconds() -> 45
    } as any;
  });

  afterEach(() => {
    global.Date = originalDate; // Restore original Date
  });

  it('should include correctly formatted current date in the default system prompt', async () => {
    // Re-mock resolved value for this specific test if it's different or to ensure clean state
     mockStreamTextFn.mockResolvedValue({
      fullStream: (async function* () {
        yield { type: 'text-delta', textDelta: 'response from test' };
      })(),
      // include other properties if the researcher function consumes them from the result
    });

    await researcher(
      '', // dynamicSystemPrompt to trigger default
      mockUiStream,
      mockStreamTextValue,
      [] // messages
    );

    // Based on MOCK_DATE_UTC = '2024-01-15T10:30:45.000Z'
    // The formatting logic is:
    // const year = now.getFullYear(); -> 2024
    // const month = (now.getMonth() + 1).toString().padStart(2, '0'); -> 01
    // const day = now.getDate().toString().padStart(2, '0'); -> 15
    // const hours = now.getHours().toString().padStart(2, '0'); -> 10 (UTC hours)
    // const minutes = now.getMinutes().toString().padStart(2, '0'); -> 30
    // const seconds = now.getSeconds().toString().padStart(2, '0'); -> 45
    // const currentDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const expectedDateString = '2024-01-15 10:30:45';

    expect(mockStreamTextFn).toHaveBeenCalledTimes(1);
    const callArgs = mockStreamTextFn.mock.calls[0][0]; // Get args of the first call
    expect(callArgs.system).toBeDefined();
    expect(callArgs.system).toContain(`Current date and time: ${expectedDateString}`);
  });
});
