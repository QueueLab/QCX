'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxCompare from 'mapbox-gl-compare';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'mapbox-gl-compare/dist/mapbox-gl-compare.css';
import { fromArrayBuffer } from 'geotiff';

interface MapCompareViewProps {
  lat: number;
  lon: number;
  year: number;
}

const MapCompareView = ({ lat, lon, year }: MapCompareViewProps) => {
  const beforeMapContainer = useRef<HTMLDivElement>(null);
  const afterMapContainer = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !beforeMapContainer.current || !afterMapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    const beforeMap = new mapboxgl.Map({
      container: beforeMapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [lon, lat],
      zoom: 12,
    });

    const afterMap = new mapboxgl.Map({
      container: afterMapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [lon, lat],
      zoom: 12,
    });

    afterMap.on('load', async () => {
      const response = await fetch(`/api/embeddings?lat=${lat}&lon=${lon}&year=${year}`);
      const arrayBuffer = await response.arrayBuffer();
      const tiff = await fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      const [red, green, blue] = await image.readRasters();

      // Create a canvas to render the RGB image
      const canvas = document.createElement('canvas');
      canvas.width = image.getWidth();
      canvas.height = image.getHeight();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        if (typeof red !== 'number' && typeof green !== 'number' && typeof blue !== 'number') {
          for (let i = 0; i < red.length; i++) {
            imageData.data[i * 4] = red[i];
            imageData.data[i * 4 + 1] = green[i];
            imageData.data[i * 4 + 2] = blue[i];
            imageData.data[i * 4 + 3] = 255;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        afterMap.addSource('tiff-source', {
          type: 'image',
          url: canvas.toDataURL(),
          coordinates: [
            [lon - 0.1, lat + 0.1],
            [lon + 0.1, lat + 0.1],
            [lon + 0.1, lat - 0.1],
            [lon - 0.1, lat - 0.1],
          ],
        });

        afterMap.addLayer({
          id: 'tiff-layer',
          type: 'raster',
          source: 'tiff-source',
          paint: {
            'raster-opacity': 0.8,
          },
        });
      }
    });

    const compare = new MapboxCompare(beforeMap, afterMap, container.current);

    return () => {
      compare.remove();
      beforeMap.remove();
      afterMap.remove();
    };
  }, [lat, lon, year]);

  return (
    <div ref={container} className="relative w-full h-96">
      <div ref={beforeMapContainer} className="absolute w-full h-full" />
      <div ref={afterMapContainer} className="absolute w-full h-full" />
    </div>
  );
};

export default MapCompareView;
