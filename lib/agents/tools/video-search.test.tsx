import { videoSearchTool } from './video-search';
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { VideoSearchSection } from '@/components/video-search-section';
import { Card } from '@/components/ui/card';

jest.mock('ai/rsc', () => ({
  createStreamableUI: jest.fn(),
  createStreamableValue: jest.fn()
}));

jest.mock('@/components/video-search-section', () => ({
  VideoSearchSection: jest.fn()
}));

jest.mock('@/components/ui/card', () => ({
  Card: jest.fn()
}));

describe('videoSearchTool', () => {
  let uiStream;
  let fullResponse;

  beforeEach(() => {
    uiStream = {
      append: jest.fn(),
      update: jest.fn()
    };
    fullResponse = '';
  });

  it('should execute video search successfully', async () => {
    const query = 'test query';

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

    const tool = videoSearchTool({ uiStream, fullResponse });
    const result = await tool.execute({ query });

    expect(result).toEqual(searchResult);
    expect(uiStream.append).toHaveBeenCalledWith(<VideoSearchSection result={streamResults.value} />);
    expect(streamResults.done).toHaveBeenCalledWith(JSON.stringify(searchResult));
  });

  it('should handle video search error', async () => {
    const query = 'test query';

    global.fetch = jest.fn(() => Promise.reject(new Error('Video Search API error')));

    const streamResults = {
      done: jest.fn(),
      value: ''
    };
    createStreamableValue.mockReturnValue(streamResults);

    const tool = videoSearchTool({ uiStream, fullResponse });
    const result = await tool.execute({ query });

    expect(result).toBeUndefined();
    expect(uiStream.update).toHaveBeenCalledWith(
      <Card className="p-4 mt-2 text-sm">
        {`An error occurred while searching for videos with "${query}".`}
      </Card>
    );
  });
});
