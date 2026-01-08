'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ForwardedRef
} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {useCallbackRef} from '@/lib/hooks/use-callback-ref';
import {useMap3DCameraEvents} from '@/lib/hooks/use-map-3d-camera-events';
import {useDeepCompareEffect} from '@/lib/hooks/use-deep-compare-effect';
import type {Map3DProps} from './map-3d-types';

export const Map3D = forwardRef(
  (
    props: Map3DProps,
    forwardedRef: ForwardedRef<google.maps.maps3d.Map3DElement | null>
  ) => {
    useMapsLibrary('maps3d');

    const [map3DElement, map3dRef] =
      useCallbackRef<google.maps.maps3d.Map3DElement>();

    useMap3DCameraEvents(map3DElement, p => {
      if (!props.onCameraChange) return;

      props.onCameraChange(p);
    });

    const [customElementsReady, setCustomElementsReady] = useState(false);
    useEffect(() => {
      customElements.whenDefined('gmp-map-3d').then(() => {
        setCustomElementsReady(true);
      });
    }, []);

    const {center, heading, tilt, range, roll, ...map3dOptions} = props;

    useDeepCompareEffect(() => {
      if (!map3DElement) return;

      // copy all values from map3dOptions to the map3D element itself
      Object.assign(map3DElement, map3dOptions);
    }, [map3DElement, map3dOptions]);

    useImperativeHandle<
      google.maps.maps3d.Map3DElement | null,
      google.maps.maps3d.Map3DElement | null
    >(forwardedRef, () => map3DElement, [map3DElement]);

    if (!customElementsReady) return null;

    return (
      <div style={props.style}>
        <gmp-map-3d
          ref={map3dRef}
          center={center}
          range={range}
          heading={heading}
          tilt={tilt}
          roll={roll}
          defaultUIHidden={true}
          mode="SATELLITE"
          style={{width: '100%', height: '100%'}}></gmp-map-3d>
      </div>
    );
  }
);

Map3D.displayName = 'Map3D';
