import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Chat } from './chat';
import { MapDataProvider } from './map/map-data-context';
import { ProfileToggleProvider } from './profile-toggle-context';
import React from 'react';
// Imports from 'ai/rsc' are now aliased to our mock file in vitest.config.ts
import { useUIState, mockSubmit } from 'ai/rsc';
// We need to import the mocked AI provider from our mocked app/actions
import { AI } from '@/app/actions';

// Mock app/actions. The alias in vitest.config.ts handles 'ai/rsc', but we
// still need to mock the module that *uses* it to create the AI provider.
vi.mock('@/app/actions', async () => {
    const { createAI } = await vi.importActual<typeof import('ai/rsc')>('ai/rsc');
    // We return a real AI provider, but it's using our mocked 'ai/rsc' functions
    // because of the alias in vitest.config.ts.
    return {
        AI: createAI({
            initialAIState: { chatId: 'test', messages: [] },
            initialUIState: [],
            actions: {
                submit: vi.fn(),
                clearChat: vi.fn(),
            },
        }),
    };
});

// Mock other dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: vi.fn(),
        replace: vi.fn(),
    }),
    usePathname: () => '/',
}));

vi.mock('@/lib/actions/chat', () => ({
    updateDrawingContext: vi.fn(),
}));

// Mock child components
vi.mock('./map/mapbox-map', () => ({
    Mapbox: () => <div data-testid="mapbox-map">Mapbox</div>,
}));

vi.mock('./settings/settings-view', () => ({
    default: () => <div>SettingsView</div>,
}));

// Helper to render the Chat component with all necessary providers
const renderChat = (uiState = []) => {
    (useUIState as vi.Mock).mockReturnValue([uiState, vi.fn()]);

    return render(
        <AI>
            <ProfileToggleProvider>
                <MapDataProvider>
                    <Chat id="test-chat-id" />
                </MapDataProvider>
            </ProfileToggleProvider>
        </AI>
    );
};

describe('Chat Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
    });

    it('should render EmptyScreen when there are no messages', () => {
        renderChat();
        expect(screen.getByText(/What is a planet computer/i)).toBeInTheDocument();
    });

    it('should render ChatMessages when there are messages', () => {
        const messages = [{ id: '1', component: <div key="1">Test Message</div>, isCollapsed: false }];
        renderChat(messages);

        expect(screen.getByText('Test Message')).toBeInTheDocument();
        expect(screen.queryByText(/What is a planet computer/i)).not.toBeInTheDocument();
    });

    it('should call the submit action when the form is submitted', async () => {
        renderChat();

        const input = screen.getByPlaceholderText(/Explore/i);
        const form = input.closest('form');
        expect(form).toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'Hello, world!' } });
        fireEvent.submit(form!);

        expect(mockSubmit).toHaveBeenCalledTimes(1);
        const formData = mockSubmit.mock.calls[0][0];
        expect(formData.get('input')).toBe('Hello, world!');
    });
});