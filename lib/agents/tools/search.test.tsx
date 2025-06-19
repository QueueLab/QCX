import { searchTool } from './search'; // Main entry point if testing through it
// Direct import for tavilySearch if preferred and it's exported
// For this test, we'll assume tavilySearch is not directly exported or we prefer to test via searchTool
// However, the subtask specifically asked to test `tavilySearch`.
// Let's assume `tavilySearch` can be exported for testing or test its effects via `searchTool`.
// Re-reading the original search.tsx, tavilySearch is an async function in the same file, not exported.
// This means I either need to export it, or test it through `searchTool`.
// The prompt asks to test `tavilySearch`. I will modify the test to reflect testing `searchTool`
// and make assertions about what `tavilySearch` *would* receive or how it affects the outcome.

// If `tavilySearch` were exported, the test would be more direct.
// For now, let's write the test as if `tavilySearch` is callable,
// and I can adjust if needed. It's better to write the specific test first.
// I will assume for now I can modify search.tsx to export tavilySearch for testing.
// **If I cannot modify search.tsx to export it, I will have to test via searchTool and mock Tavily API.**

// Let's proceed with the direct test for `tavilySearch` assuming it can be made available.
// If not, I will write a different test.

// Mocking fetch
const mockFetchPromise = Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ results: [] }), // Mock a basic Tavily response
});
global.fetch = jest.fn(() => mockFetchPromise) as jest.Mock;

// Hold onto the original Date object
const OriginalDate = global.Date;

describe('searchTool and tavilySearch', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

    // Mock Date: "2024-02-20 15:45:30"
    const MOCK_DATE_UTC = '2024-02-20T15:45:30.000Z';
    global.Date = class extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length) {
          // @ts-ignore
          return new OriginalDate(...args);
        }
        return new OriginalDate(MOCK_DATE_UTC);
      }

      static now() {
        return new OriginalDate(MOCK_DATE_UTC).getTime();
      }
    } as any;
  });

  afterEach(() => {
    global.Date = OriginalDate; // Restore original Date object
  });

  // This test assumes tavilySearch is exported from search.tsx
  // If not, this test would need to be adapted or search.tsx modified.
  // For the purpose of this exercise, we are focusing on the logic inside tavilySearch.

  // To test tavilySearch directly, it MUST be exported from its module.
  // Let's simulate its direct test. If search.tsx is not changed to export it, this test won't run as is.
  // The alternative is to test `searchTool` and verify the `fetch` call.

  // Let's get tavilySearch. If it's not exported, this will be a conceptual test.
  // For now, I'll write the test code for tavilySearch.
  // I'll need to read search.tsx again to confirm its export.
  // The previous read showed it as a local async function: async function tavilySearch(...)
  // So, it's not exported.

  // Plan Adjustment:
  // 1. Modify `search.tsx` to export `tavilySearch`.
  // 2. Write the test for the exported `tavilySearch`.

  // For now, I will write the test file assuming `tavilySearch` will be exported.
  // I will handle the export modification in a subsequent step.

  it('tavilySearch should include formatted current date in the query sent to Tavily API', async () => {
    // Dynamically import tavilySearch AFTER mocks are set up if it's not top-level exported
    // Or ensure search.tsx is modified to export it.
    // For this example, assume search.tsx will be modified to export tavilySearch.

    // Temporarily import search.tsx to see if we can get tavilySearch
    // This is a placeholder for how it might be imported.
    const { tavilySearch: tavilySearchFn } = await import('./search'); // This will fail if not exported

    const sampleQuery = 'test query for Tavily';
    const expectedDateString = '2024-02-20 15:45:30'; // From MOCK_DATE_UTC

    await tavilySearchFn(sampleQuery, 5, 'basic');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toBe('https://api.tavily.com/search'); // URL

    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toBe(`${sampleQuery} current time: ${expectedDateString}`);
    expect(body.api_key).toBe(process.env.TAVILY_API_KEY); // Ensure API key is still passed
    expect(body.max_results).toBe(5);
    expect(body.search_depth).toBe('basic');
  });
});
