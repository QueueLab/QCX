'use client';

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface GoogleGeoJsonLayerProps {
  data: GeoJSON.FeatureCollection;
}

export function GoogleGeoJsonLayer({ data }: GoogleGeoJsonLayerProps) {
  const map = useMap();
  const layerRef = useRef<google.maps.Data | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing layer if it exists
    if (layerRef.current) {
      layerRef.current.setMap(null);
    }

    // Create a new data layer
    const newLayer = new google.maps.Data();
    layerRef.current = newLayer;

    // Set styles for polygons and polylines
    newLayer.setStyle(feature => {
      const geometryType = feature.getGeometry()?.getType();
      if (geometryType === 'Polygon') {
        return {
          fillColor: '#088',
          fillOpacity: 0.4,
          strokeColor: '#088',
          strokeWeight: 2,
        };
      }
      if (geometryType === 'LineString') {
        return {
          strokeColor: '#088',
          strokeWeight: 2,
        };
      }
      return {};
    });

    // Add GeoJSON data to the layer
    newLayer.addGeoJson(data);

    // Set the map for the new layer
    newLayer.setMap(map);

    return () => {
      if (newLayer) {
        newLayer.setMap(null);
      }
    };
  }, [map, data]);

  return null;
}
