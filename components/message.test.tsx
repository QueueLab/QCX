import React from 'react';
import { render, screen } from '@testing-library/react';
import { BotMessage } from './message'; // Adjust path as needed
import { StreamableValue, useStreamableValue } from 'ai/rsc';

// Mock ai/rsc's useStreamableValue
jest.mock('ai/rsc', () => ({
  ...jest.requireActual('ai/rsc'), // Import and retain default exports
  useStreamableValue: jest.fn(),
}));

// Mock MemoizedReactMarkdown to verify its usage
jest.mock('./ui/markdown', () => ({
  MemoizedReactMarkdown: jest.fn(({ children }) => <div data-testid="markdown-mock">{children}</div>),
}));

// Mock katex CSS (important for avoiding CSS import errors in Jest)
jest.mock('katex/dist/katex.min.css', () => '');

describe('BotMessage', () => {
  const mockUseStreamableValue = useStreamableValue as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockUseStreamableValue.mockReset();
    jest.clearAllMocks();
  });

  it('renders regular text content using MemoizedReactMarkdown', () => {
    const regularContent = 'This is a regular message.';
    // Mock useStreamableValue to return the regular content
    mockUseStreamableValue.mockReturnValue([regularContent, null, false]);

    // Create a mock StreamableValue (the actual creation logic might be complex,
    // but for the component, it just needs to be passed down)
    const mockStreamableContent = {} as StreamableValue<string>;

    render(<BotMessage content={mockStreamableContent} />);

    // Check that MemoizedReactMarkdown is called with the processed data
    expect(screen.getByTestId('markdown-mock')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-mock')).toHaveTextContent(regularContent);
    // Check that our custom reasoning div is not present
    expect(screen.queryByRole('div', { className: 'reasoning-text' })).not.toBeInTheDocument();
  });

  it('renders reasoning-prefixed text with distinct style and not via Markdown', () => {
    const reasoningContent = '[reasoning] This is a reasoning chunk.';
    const expectedReasoningText = 'This is a reasoning chunk.';
    // Mock useStreamableValue to return the reasoning content
    mockUseStreamableValue.mockReturnValue([reasoningContent, null, false]);

    const mockStreamableContent = {} as StreamableValue<string>;

    render(<BotMessage content={mockStreamableContent} />);

    // Check that the reasoning text div is present
    const reasoningDiv = screen.getByText(expectedReasoningText);
    expect(reasoningDiv).toBeInTheDocument();
    // Check for the specific class and style (approximate check for style)
    // Note: Testing exact CSS computed styles is more involved and often needs a more complex setup.
    // We'll check for the presence of the class and the inline style attribute.
    expect(reasoningDiv).toHaveClass('reasoning-text');
    expect(reasoningDiv).toHaveAttribute('style', expect.stringContaining('font-style: italic;'));
    expect(reasoningDiv).toHaveAttribute('style', expect.stringContaining('color: grey;'));

    // Check that MemoizedReactMarkdown mock was NOT called
    expect(screen.queryByTestId('markdown-mock')).not.toBeInTheDocument();
  });

  it('handles LaTeX preprocessing correctly for regular messages', () => {
    const latexContent = 'This is a message with inline \\(E=mc^2\\) and block \\\\[A=\\pi r^2\\\\] equations.';
    const expectedProcessedLatex = 'This is a message with inline $E=mc^2$ and block $$A=\\pi r^2$$ equations.';
    mockUseStreamableValue.mockReturnValue([latexContent, null, false]);
    const mockStreamableContent = {} as StreamableValue<string>;

    render(<BotMessage content={mockStreamableContent} />);
    expect(screen.getByTestId('markdown-mock')).toHaveTextContent(expectedProcessedLatex);
  });

  it('handles LaTeX preprocessing correctly for reasoning messages', () => {
    const latexReasoningContent = '[reasoning] Reasoning with inline \\(E=mc^2\\) and block \\\\[A=\\pi r^2\\\\] equations.';
    // The [reasoning] prefix is stripped, then LaTeX is processed.
    const expectedProcessedLatexReasoning = 'Reasoning with inline $E=mc^2$ and block $$A=\\pi r^2$$ equations.';
    mockUseStreamableValue.mockReturnValue([latexReasoningContent, null, false]);
    const mockStreamableContent = {} as StreamableValue<string>;

    render(<BotMessage content={mockStreamableContent} />);
    const reasoningDiv = screen.getByText(expectedProcessedLatexReasoning);
    expect(reasoningDiv).toBeInTheDocument();
    expect(reasoningDiv).toHaveClass('reasoning-text');
  });

  it('displays error message when error occurs', () => {
    mockUseStreamableValue.mockReturnValue([null, new Error('Test error'), false]);
    const mockStreamableContent = {} as StreamableValue<string>;
    render(<BotMessage content={mockStreamableContent} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('handles pending state (optional, but good to cover if there was specific pending UI)', () => {
    mockUseStreamableValue.mockReturnValue([null, null, true]); // data, error, pending
    const mockStreamableContent = {} as StreamableValue<string>;
    // Assuming component renders nothing or a specific loader when pending and no data
    // For current BotMessage, it would render MemoizedReactMarkdown with empty string if data is null/undefined
    // or the reasoning div with empty string if it started with [reasoning]
    const { container } = render(<BotMessage content={mockStreamableContent} />);
    // Check if MemoizedReactMarkdown is rendered with empty content (or specific loader)
    // Based on current implementation, it will try to process `undefined || ''` which is `''`
    // and then pass `''` to MemoizedReactMarkdown
    expect(screen.getByTestId('markdown-mock')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-mock')).toHaveTextContent('');
  });
});
