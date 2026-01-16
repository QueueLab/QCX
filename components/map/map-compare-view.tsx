'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxCompare from 'mapbox-gl-compare';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'mapbox-gl-compare/dist/mapbox-gl-compare.css';
import type { FeatureCollection } from 'geojson';

interface MapCompareViewProps {
  geoJson: FeatureCollection;
}

const MapCompareView = ({ geoJson }: MapCompareViewProps) => {
  const beforeMapContainer = useRef<HTMLDivElement>(null);
  const afterMapContainer = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !beforeMapContainer.current || !afterMapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    const beforeMap = new mapboxgl.Map({
      container: beforeMapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [-74.5, 40],
      zoom: 9,
    });

    const afterMap = new mapboxgl.Map({
      container: afterMapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [-74.5, 40],
      zoom: 9,
    });

    afterMap.on('load', () => {
      afterMap.addSource('geojson-source', {
        type: 'geojson',
        data: geoJson,
      });

      afterMap.addLayer({
        id: 'geojson-layer',
        type: 'fill',
        source: 'geojson-source',
        paint: {
          'fill-color': '#007cbf',
          'fill-opacity': 0.5,
        },
      });
    });

    const compare = new MapboxCompare(beforeMap, afterMap, container.current);

    return () => {
      compare.remove();
      beforeMap.remove();
      afterMap.remove();
    };
  }, [geoJson]);

  return (
    <div ref={container} className="relative w-full h-96">
      <div ref={beforeMapContainer} className="absolute w-full h-full" />
      <div ref={afterMapContainer} className="absolute w-full h-full" />
    </div>
  );
};

export default MapCompareView;
