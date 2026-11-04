// @ts-nocheck

import type {CSSProperties} from 'react';

declare global {
  namespace google.maps {
    // an interface for the Maps3DLibrary is not available in @types/google.maps,
    // so we define it here.
    export interface Maps3DLibrary {
      Map3DElement: typeof Map3DElement;
      Marker3DElement: typeof Marker3DElement;
    }

    export namespace maps3d {
      export interface Map3DElementOptions {
        center?: google.maps.LatLng | google.maps.LatLngLiteral;
        heading?: number;
        mode?: 'SATELLITE' | 'TERRAIN';
        range?: number;
        roll?: number;
        tilt?: number;
      }

      export class Map3DElement extends HTMLElement {
        constructor(options: Map3DElementOptions);
        center: google.maps.LatLng;
        heading: number;
        range: number;
        roll: number;
        tilt: number;
      }

      export class Marker3DElement extends HTMLElement {
        constructor(options: {
          position: { lat: number; lng: number; altitude?: number };
          altitudeMode?: 'CLAMP_TO_GROUND' | 'RELATIVE_TO_GROUND' | 'ABSOLUTE';
          label?: string;
          extruded?: boolean;
        });
        position: { lat: number; lng: number; altitude?: number };
        label: string;
      }
    }
  }
}

/**
 * The props for the Map3D component.
 */
export interface Map3DProps extends google.maps.maps3d.Map3DElementOptions {
  style?: CSSProperties;
  onCameraChange?: (e: Map3DCameraChangeEvent) => void;
  cameraOptions?: {
    center?: { lat: number; lng: number };
    heading?: number;
    tilt?: number;
    range?: number;
  };
}

/**
 * The event-object passed to the camera change event.
 */
export interface Map3DCameraChangeEvent extends CustomEvent {
  readonly detail: {
    readonly center: google.maps.LatLng;
    readonly range: number;
    readonly heading: number;
    readonly tilt: number;
    readonly roll: number;
  };
}

declare module '@vis.gl/react-google-maps' {
  export function useMapsLibrary(name: 'maps3d'): google.maps.Maps3DLibrary | null;
  export function useMapsLibrary(name: 'elevation'): google.maps.ElevationLibrary | null;
  export function useMapsLibrary(name: 'places'): google.maps.PlacesLibrary | null;
  export function useMapsLibrary(name: 'geocoding'): google.maps.GeocodingLibrary | null;
}
