import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatPanel } from './chat-panel';
import { useUIState, useActions, mockSubmit } from 'ai/rsc';
import React from 'react';

// Mock the AI provider and hooks.
// Since we are testing ChatPanel in isolation, we can provide a simplified AI context.
const MockAIProvider = ({ children }) => <>{children}</>;
vi.mock('@/app/actions', () => ({
    AI: MockAIProvider,
    // Provide a mock for clearChat as it's used in the component
    clearChat: vi.fn(),
}));

describe('ChatPanel Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock implementations for the hooks used by ChatPanel
        (useUIState as vi.Mock).mockReturnValue([[], vi.fn()]);
        (useActions as vi.Mock).mockReturnValue({ submit: mockSubmit, clearChat: vi.fn() });
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
    });

    it('should render the input form', () => {
        render(<ChatPanel messages={[]} input="" setInput={vi.fn()} />);
        expect(screen.getByPlaceholderText(/Explore/i)).toBeInTheDocument();
    });

    it('should call submit when the form is submitted with text', () => {
        const setInput = vi.fn();
        render(<ChatPanel messages={[]} input="Hello" setInput={setInput} />);

        const form = screen.getByRole('form');
        fireEvent.submit(form);

        expect(mockSubmit).toHaveBeenCalledTimes(1);
        const formData = mockSubmit.mock.calls[0][0];
        expect(formData.get('input')).toBe('Hello');

        // It should also call setInput to clear the input
        expect(setInput).toHaveBeenCalledWith('');
    });

    it('should not render the "New" button when there are no messages', () => {
        render(<ChatPanel messages={[]} input="" setInput={vi.fn()} />);
        expect(screen.queryByText('New')).not.toBeInTheDocument();
    });

    it('should render the "New" button when there are messages', () => {
        const messages = [{ id: '1', component: <div key="1">Test</div> }];
        render(<ChatPanel messages={messages} input="" setInput={vi.fn()} />);
        expect(screen.getByText('New')).toBeInTheDocument();
    });
});