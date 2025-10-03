import { vi } from 'vitest';
import React from 'react';

// This is the mock submit function that our tests can spy on.
export const mockSubmit = vi.fn();

// Mock implementation of useUIState
export const useUIState = vi.fn(() => [[]]);

// Mock implementation of useAIState
export const useAIState = vi.fn(() => [{ messages: [] }]);

// Mock implementation of useActions
export const useActions = vi.fn(() => ({
    submit: mockSubmit,
}));

// Mock implementation of createAI. It returns a dummy React component.
export const createAI = vi.fn(() => ({ children }) => <>{children}</>);

// Mock implementations for other functions from ai/rsc.
export const createStreamableUI = vi.fn();
export const createStreamableValue = vi.fn();
export const getAIState = vi.fn();
export const getMutableAIState = vi.fn(() => ({
    get: vi.fn(() => ({ messages: [] })),
    update: vi.fn(),
    done: vi.fn(),
}));

// This hook is used by CollapsibleMessage. It needs to return an array-like value.
export const useStreamableValue = vi.fn(initial => [initial]);