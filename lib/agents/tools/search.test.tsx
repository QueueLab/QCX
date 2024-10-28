import { searchTool } from './search';
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { SearchSection } from '@/components/search-section';
import { Card } from '@/components/ui/card';

jest.mock('ai/rsc', () => ({
  createStreamableUI: jest.fn(),
  createStreamableValue: jest.fn()
}));

jest.mock('@/components/search-section', () => ({
  SearchSection: jest.fn()
}));

jest.mock('@/components/ui/card', () => ({
  Card: jest.fn()
}));

describe('searchTool', () => {
  let uiStream;
  let fullResponse;

  beforeEach(() => {
    uiStream = {
      append: jest.fn(),
      update: jest.fn()
    };
    fullResponse = '';
  });

  it('should execute search successfully with tavilySearch', async () => {
    const query = 'test query';
    const max_results = 10;
    const search_depth = 'basic';

    const searchResult = { results: [] };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(searchResult)
      })
    );

    const streamResults = {
      done: jest.fn(),
      value: ''
    };
    createStreamableValue.mockReturnValue(streamResults);

    const tool = searchTool({ uiStream, fullResponse });
    const result = await tool.execute({ query, max_results, search_depth });

    expect(result).toEqual(searchResult);
    expect(uiStream.append).toHaveBeenCalledWith(<SearchSection result={streamResults.value} />);
    expect(streamResults.done).toHaveBeenCalledWith(JSON.stringify(searchResult));
  });

  it('should handle search error', async () => {
    const query = 'test query';
    const max_results = 10;
    const search_depth = 'basic';

    global.fetch = jest.fn(() => Promise.reject(new Error('Search API error')));

    const streamResults = {
      done: jest.fn(),
      value: ''
    };
    createStreamableValue.mockReturnValue(streamResults);

    const tool = searchTool({ uiStream, fullResponse });
    const result = await tool.execute({ query, max_results, search_depth });

    expect(result).toBeUndefined();
    expect(uiStream.update).toHaveBeenCalledWith(
      <Card className="p-4 mt-2 text-sm">
        {`An error occurred while searching for "${query}".`}
      </Card>
    );
  });
});
