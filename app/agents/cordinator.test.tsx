import { AgentCoordinator } from './cordinator';
import { createStreamableUI } from 'ai/rsc';
import { CoreMessage } from 'ai';
import { AgentFactory } from './AgentFactory';
import { upstash } from '@upstash/qstash';

jest.mock('@upstash/qstash', () => ({
  upstash: jest.fn().mockReturnValue({
    publishJSON: jest.fn(),
  }),
}));

jest.mock('./AgentFactory', () => ({
  AgentFactory: {
    createAgent: jest.fn(),
  },
}));

describe('AgentCoordinator', () => {
  let coordinator: AgentCoordinator;
  let uiStream: ReturnType<typeof createStreamableUI>;
  let messages: CoreMessage[];

  beforeEach(() => {
    coordinator = new AgentCoordinator();
    uiStream = createStreamableUI();
    messages = [
      { role: 'user', content: 'Test message' },
      { role: 'system', content: 'Test location' },
    ];
  });

  it('should execute workflow and publish result to Upstash', async () => {
    const mockAgent = {
      execute: jest.fn().mockResolvedValue('Test result'),
    };
    (AgentFactory.createAgent as jest.Mock).mockReturnValue(mockAgent);

    const result = await coordinator.executeWorkflow('testWorkflow', uiStream, messages);

    expect(AgentFactory.createAgent).toHaveBeenCalledWith('testWorkflow', uiStream, messages);
    expect(mockAgent.execute).toHaveBeenCalled();
    expect(result).toBe('Test result');
    expect(upstash().publishJSON).toHaveBeenCalledWith({
      topic: 'agent-results',
      body: {
        workflowType: 'testWorkflow',
        result: 'Test result',
        timestamp: expect.any(String),
        location: 'Test location',
      },
    });
  });
});
