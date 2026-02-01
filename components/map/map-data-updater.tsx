'use client';

import { useEffect } from 'react';
import { useMapData } from './map-data-context';
import { useMap } from './map-context';
import type { FeatureCollection } from 'geojson';
import * as turf from '@turf/turf';

interface MapDataUpdaterProps {
  id: string;
  data: any; // FeatureCollection or Feature
  filename: string;
}

export function MapDataUpdater({ id, data, filename }: MapDataUpdaterProps) {
  const { setMapData } = useMapData();
  const { map } = useMap();

  useEffect(() => {
    if (!data) return;

    // Ensure it's a FeatureCollection for consistency
    const featureCollection: FeatureCollection = data.type === 'FeatureCollection'
      ? data
      : { type: 'FeatureCollection', features: [data] };

    // Update MapData context
    setMapData(prev => {
      // Avoid duplicate entries
      const alreadyExists = prev.uploadedGeoJson?.some(item => item.id === id);
      if (alreadyExists) return prev;

      return {
        ...prev,
        uploadedGeoJson: [
          ...(prev.uploadedGeoJson || []),
          {
            id,
            filename,
            data: featureCollection,
            visible: true
          }
        ]
      };
    });

    // Fly to the extent of the GeoJSON
    if (map && featureCollection.features.length > 0) {
      try {
        const bbox = turf.bbox(featureCollection);
        map.fitBounds(bbox as [number, number, number, number], {
          padding: 50,
          maxZoom: 15,
          duration: 2000
        });
      } catch (e) {
        console.error('Failed to fit bounds for GeoJSON:', e);
      }
    }
  }, [id, data, filename, setMapData, map]);

  return null; // Headless component
}
