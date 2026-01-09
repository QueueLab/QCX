'use client';

import {useCallback, useState} from 'react';

/**
 * A custom hook that converts a callback ref to a state ref.
 * This is useful when you need to handle the ref as a state, for example
 * to use it as a dependency in other hooks.
 */
export function useCallbackRef<T>(): [T | null, (node: T | null) => void] {
  const [ref, setRef] = useState<T | null>(null);
  const callbackRef = useCallback((node: T | null) => {
    setRef(node);
  }, []);
  return [ref, callbackRef];
}
