/// <reference lib="webworker" />
import { centerOfMass, length as turfLength, along as turfAlong, lineString as turfLineString } from '@turf/turf';
import * as turf from '@turf/turf'

self.onmessage = (event: MessageEvent<{ features: any[] }>) => {
  const { features } = event.data;

  const results = features.map(feature => {
    const id = feature.id as string;
    let calculation = null;
    let error: string | null = null;

    try {
      if (feature.geometry.type === 'Polygon') {
        const center = centerOfMass(feature).geometry.coordinates;
        const area = turf.area(feature);
        calculation = {
          type: 'Polygon',
          area,
          center,
        };
      } else if (feature.geometry.type === 'LineString') {
        const line = turfLineString(feature.geometry.coordinates);
        const len = turfLength(line, { units: 'kilometers' });
        const midpoint = turfAlong(line, len / 2, { units: 'kilometers' }).geometry.coordinates;
        calculation = {
          type: 'LineString',
          length: len * 1000, // convert to meters
          center: midpoint,
        };
      }
    } catch (e: any) {
      error = e.message;
    }

    return { id, calculation, error };
  });

  self.postMessage(results);
};
