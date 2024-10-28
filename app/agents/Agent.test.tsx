import { InquiryAgent, LandUseAgent } from './Agent';
import { getModel } from '../utils';
import { streamObject } from 'ai';
import { createStreamableValue } from '@/lib/streamable-value';

jest.mock('../utils', () => ({
  getModel: jest.fn()
}));

jest.mock('ai', () => ({
  streamObject: jest.fn()
}));

jest.mock('@/lib/streamable-value', () => ({
  createStreamableValue: jest.fn(() => ({
    update: jest.fn(),
    done: jest.fn()
  }))
}));

describe('InquiryAgent', () => {
  let inquiryAgent;
  let uiStream;

  beforeEach(() => {
    uiStream = {
      append: jest.fn()
    };
    inquiryAgent = new InquiryAgent(uiStream, []);
  });

  it('should execute and return a PartialInquiry', async () => {
    const mockPartialInquiry = { question: 'What is the capital of France?' };
    const mockStream = {
      partialObjectStream: [mockPartialInquiry]
    };

    streamObject.mockResolvedValue(mockStream);

    const result = await inquiryAgent.execute();

    expect(result).toEqual(mockPartialInquiry);
    expect(uiStream.append).toHaveBeenCalled();
    expect(createStreamableValue).toHaveBeenCalled();
  });
});

describe('LandUseAgent', () => {
  let landUseAgent;
  let uiStream;

  beforeEach(() => {
    uiStream = {
      append: jest.fn()
    };
    landUseAgent = new LandUseAgent(uiStream, []);
  });

  it('should execute and return an empty object', async () => {
    const result = await landUseAgent.execute();

    expect(result).toEqual({});
  });
});
