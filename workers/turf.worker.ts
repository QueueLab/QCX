/// <reference lib="webworker" />
import * as turf from '@turf/turf'

self.onmessage = (event: MessageEvent<{ features: any[] }>) => {
  const { features } = event.data;

  const results = features.map(feature => {
    const id = feature.id as string;
    let calculation = null;

    if (feature.geometry.type === 'Polygon') {
      const area = turf.area(feature);
      const centroid = turf.centroid(feature);
      calculation = {
        type: 'Polygon',
        area,
        center: centroid.geometry.coordinates
      };
    } else if (feature.geometry.type === 'LineString') {
      const length = turf.length(feature, { units: 'kilometers' }) * 1000; // in meters
      const line = feature.geometry.coordinates;
      const midIndex = Math.floor(line.length / 2) - 1;
      const midpoint = midIndex >= 0 ? line[midIndex] : line[0];
      calculation = {
        type: 'LineString',
        length,
        center: midpoint
      };
    }

    return { id, calculation };
  });

  self.postMessage(results);
};
