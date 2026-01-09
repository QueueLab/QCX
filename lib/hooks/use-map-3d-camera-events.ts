'use client';

import {useEffect, useState} from 'react';
import type {Map3DCameraChangeEvent} from '@/components/map/map-3d-types';

export function useMap3DCameraEvents(
  map3DElement: google.maps.maps3d.Map3DElement | null,
  handler: (e: Map3DCameraChangeEvent) => void
) {
  const [isHandlerAttached, setIsHandlerAttached] = useState(false);

  useEffect(() => {
    if (!map3DElement || isHandlerAttached) return;

    map3DElement.addEventListener('camerachange', handler as EventListener);
    setIsHandlerAttached(true);

    return () => {
      map3DElement.removeEventListener('camerachange', handler as EventListener);
      setIsHandlerAttached(false);
    };
  }, [map3DElement, handler, isHandlerAttached]);
}
