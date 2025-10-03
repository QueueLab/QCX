// @ts-nocheck
import { searchTool } from './search'; // Adjust path as necessary
import { searchSchema } from '@/lib/schema/search'; // For default params

// Mock createStreamableValue from 'ai/rsc'
jest.mock('ai/rsc', () => ({
  createStreamableValue: jest.fn(() => ({
    update: jest.fn(),
    done: jest.fn(),
    value: '',
  })),
}));

// Mock Exa from 'exa-js'
const mockExaSearchAndContents = jest.fn().mockResolvedValue({ results: [] });
jest.mock('exa-js', () => {
  return jest.fn().mockImplementation(() => {
    return { searchAndContents: mockExaSearchAndContents };
  });
});

// Mock global fetch for Tavily
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ results: [] }),
  })
) as jest.Mock;

describe('searchTool', () => {
  let uiStreamMock: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    uiStreamMock = {
      append: jest.fn(),
      update: jest.fn(),
    };
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      TAVILY_API_KEY: 'test-tavily-key',
      EXA_API_KEY: 'test-exa-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const defaultParams = {
    max_results: 5,
    search_depth: 'basic' as 'basic' | 'advanced',
  };

  it('should call tavilySearch with the original query if no location/time is provided', async () => {
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'test query';
    await execute({ query, ...defaultParams });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query })),
      })
    );
  });

  it('should call tavilySearch with a modified query if location and time are provided', async () => {
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'restaurants';
    const latitude = 34.05;
    const longitude = -118.24;
    const datetime = '2024-07-15 12:00:00';
    const expectedQuery = `${query} near ${latitude},${longitude} around ${datetime}`;

    await execute({ query, latitude, longitude, datetime, ...defaultParams });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query: expectedQuery })),
      })
    );
  });

  it('should pad short queries to 5 characters for tavilySearch', async () => {
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'abc';
    const expectedPaddedQuery = 'abc  '; // Padded to 5 chars

    await execute({ query, ...defaultParams });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query: expectedPaddedQuery })),
      })
    );
  });

  it('should pad short queries to 5 characters for tavilySearch even with location/time', async () => {
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'q';
    const latitude = 30;
    const longitude = -100;
    const datetime = '2024-01-01 10:00:00';
    // The constructed query "q near 30,-100 around 2024-01-01 10:00:00" is long enough.
    // The padding logic applies to the *final* search query.
    // Let's test the case where the *original* query is short, but the combined one is not.
    // The current implementation pads the *final* constructed searchQuery.
    // So, if "q near ..." is already > 5 chars, no padding is added to "q" itself *before* construction.
    // The test should verify if the *final* search string sent to Tavily is padded if *it* is too short.

    // Scenario 1: query="q", resulting in "q near lat,lon around date" (long)
    const longCombinedQuery = `${query} near ${latitude},${longitude} around ${datetime}`;
    await execute({ query, latitude, longitude, datetime, ...defaultParams });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query: longCombinedQuery })),
      })
    );
    jest.clearAllMocks(); // Clear mocks for the next part of this test.

    // Scenario 2: The *whole constructed query* is short (less likely with lat/lon/datetime but for testing padding)
    // To test this, we need to ensure the entire string "query near lat,lon around datetime" is short.
    // This is tricky because lat/lon/datetime make it long.
    // Let's re-evaluate the padding logic:
    // const filledQuery = searchQuery.length < 5 ? searchQuery + ' '.repeat(5 - searchQuery.length) : searchQuery;
    // This means the *final* `searchQuery` (potentially with near/around) is what gets padded.

    // For this test, let's assume a very short query and no lat/lon/time to test padding of `searchQuery`.
    const shortQueryAlone = "s";
    const expectedPaddedShortQueryAlone = "s    ";
     await execute({ query: shortQueryAlone, ...defaultParams });
     expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query: expectedPaddedShortQueryAlone})),
      })
    );
  });

  it('should use max_results (min 5 for Tavily) and search_depth for tavilySearch', async () => {
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'test query';

    // Test with max_results < 5
    await execute({ query, max_results: 3, search_depth: 'advanced' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query, max_results: 5, search_depth: 'advanced' })),
      })
    );
    jest.clearAllMocks();

    // Test with max_results >= 5
    await execute({ query, max_results: 7, search_depth: 'basic' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        body: JSON.stringify(expect.objectContaining({ query, max_results: 7, search_depth: 'basic' })),
      })
    );
  });

  // Since searchAPI is hardcoded to 'tavily' in the current implementation,
  // testing exaSearch path would require modifying the source or more complex mocking.
  // If exaSearch were selectable, tests would look like this:
  /*
  it('should call exaSearch if searchAPI is "exa" (conceptual)', async () => {
    // Hypothetically, if we could set searchAPI to 'exa'
    // For now, this test is more of a placeholder for that possibility.
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'exa test';
    // Modify search.tsx to allow searchAPI to be 'exa' for this test or mock it.
    // This is not possible without changing the original file's const searchAPI = 'tavily'

    // For now, we can only test that exaSearch is NOT called when tavily is default.
    await execute({ query, ...defaultParams });
    expect(mockExaSearchAndContents).not.toHaveBeenCalled();

    // If we were to test exa, it would be:
    // await execute({ query, ...defaultParams, search_api_override: 'exa' }); // Fictional override
    // expect(mockExaSearchAndContents).toHaveBeenCalledWith(query, expect.anything());
  });
  */

  it('should handle Tavily API errors gracefully', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }));
    const { execute } = searchTool({ uiStream: uiStreamMock, fullResponse: '' });
    const query = 'error test';
    let fullResponseAccumulator = '';
    const tool = searchTool({ uiStream: uiStreamMock, fullResponse: fullResponseAccumulator });


    const result = await tool.execute({ query, ...defaultParams });

    expect(uiStreamMock.update).toHaveBeenCalledWith(expect.anything()); // Check for error card update
    // Check if fullResponse was updated (note: fullResponse is passed by value, so this check needs adjustment)
    // The tool returns the searchResult, which would be undefined/error object from the catch block
    // The fullResponse string is updated via side-effect in the original design, tricky to test directly here.
    // We'll check if the error message was shown in uiStream.update
    const lastCall = uiStreamMock.update.mock.calls[0][0];
    expect(lastCall.props.children).toContain(`An error occurred while searching for "${query}".`);
    expect(result).toBeUndefined(); // Or whatever the catch block returns
  });
});

// Helper to get default searchSchema values if needed for some tests
// const defaultSchemaValues = searchSchema.parse({});
// console.log(defaultSchemaValues); // { query: '', max_results: 5, search_depth: 'basic' }
// This shows that query is required by schema, so tests must always provide it.
// Default values for max_results and search_depth are handled by Zod if not provided,
// but our execute function signature expects them.
// The `defaultParams` object handles this for tests.
