import { locationTool } from './location';
import { createStreamableValue } from 'ai/rsc';
import { Card } from '@/components/ui/card';

jest.mock('ai/rsc', () => ({
  createStreamableValue: jest.fn()
}));

jest.mock('@/components/ui/card', () => ({
  Card: jest.fn()
}));

describe('locationTool', () => {
  let uiStream;
  let fullResponse;

  beforeEach(() => {
    uiStream = {
      append: jest.fn(),
      update: jest.fn()
    };
    fullResponse = '';
  });

  it('should execute location intelligence successfully', async () => {
    const query = 'location intelligence query';

    const locationResult = { results: [] };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(locationResult)
      })
    );

    const streamResults = {
      done: jest.fn(),
      value: ''
    };
    createStreamableValue.mockReturnValue(streamResults);

    const tool = locationTool({ uiStream, fullResponse });
    const result = await tool.execute({ query });

    expect(result).toEqual(locationResult);
    expect(uiStream.append).toHaveBeenCalledWith(<Card className="p-4 mt-2 text-sm">{JSON.stringify(locationResult)}</Card>);
    expect(streamResults.done).toHaveBeenCalledWith(JSON.stringify(locationResult));
  });

  it('should handle location intelligence error', async () => {
    const query = 'location intelligence query';

    global.fetch = jest.fn(() => Promise.reject(new Error('Location API error')));

    const streamResults = {
      done: jest.fn(),
      value: ''
    };
    createStreamableValue.mockReturnValue(streamResults);

    const tool = locationTool({ uiStream, fullResponse });
    const result = await tool.execute({ query });

    expect(result).toBeUndefined();
    expect(uiStream.update).toHaveBeenCalledWith(
      <Card className="p-4 mt-2 text-sm">
        {`An error occurred while processing the location intelligence query "${query}".`}
      </Card>
    );
  });
});
