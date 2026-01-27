'use client';

import {useEffect, useRef} from 'react';
import {isEqual} from 'lodash';

/**
 * A custom hook that compares dependencies using a deep equality check
 * to prevent re-running the effect when dependencies have not changed value,
 * but have changed reference.
 */
export function useDeepCompareEffect(
  callback: React.EffectCallback,
  dependencies: unknown[]
) {
  const currentDependenciesRef = useRef<unknown[]>(undefined);

  if (!isEqual(currentDependenciesRef.current, dependencies)) {
    currentDependenciesRef.current = dependencies;
  }

  useEffect(callback, [currentDependenciesRef.current]);
}
