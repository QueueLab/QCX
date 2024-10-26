import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useMapToggle, MapToggleEnum } from '../map-toggle-context';
import debounce from 'lodash.debounce';
import { detectMapImage, overlayMapImage } from '@/lib/utils/map-utils';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{ position: { latitude: number; longitude: number; }, overlays?: any[] }> = ({ position, overlays }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { mapType } = useMapToggle();
  const [isLoading, setIsLoading] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number; } | null>(null);

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      const initialCenter: [number, number] = [
        position?.longitude ?? 0,
        position?.latitude ?? 0
      ];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: initialCenter,
        zoom: 12,
        pitch: 60,
        bearing: -20,
        maxZoom: 22,
        attributionControl: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

      map.current.on('load', () => {
        if (!map.current) return;

        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });

        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        map.current.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });

        // Add custom map overlays
        map.current.addSource('points-of-interest', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [position.longitude, position.latitude],
                },
                properties: {
                  title: 'Current Location',
                  description: 'This is your current location.',
                },
              },
            ],
          },
        });

        map.current.addLayer({
          id: 'poi-labels',
          type: 'symbol',
          source: 'points-of-interest',
          layout: {
            'text-field': ['get', 'title'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 0.6],
            'text-anchor': 'top',
          },
        });

        // Add contextual overlays
        if (overlays && overlays.length > 0) {
          overlays.forEach((overlay, index) => {
            map.current?.addSource(`overlay-${index}`, {
              type: 'geojson',
              data: overlay.data,
            });

            map.current?.addLayer({
              id: `overlay-layer-${index}`,
              type: overlay.type,
              source: `overlay-${index}`,
              layout: overlay.layout,
              paint: overlay.paint,
            });
          });
        }

        // Add contour lines
        map.current.addSource('contours', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-terrain-v2'
        });

        map.current.addLayer({
          id: 'contour-layer',
          type: 'line',
          source: 'contours',
          'source-layer': 'contour',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ff69b4',
            'line-width': 1
          }
        });
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapContainer, overlays]);

  useEffect(() => {
    if (map.current && position?.latitude && position?.longitude) {
      updateMapPosition(position.latitude, position.longitude);
    }
  }, [position]);

  useEffect(() => {
    if (mapType !== MapToggleEnum.RealTimeMode) return;

    let watchId: number | null = null;
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser');
    } else {
      const success = async (geoPos: GeolocationPosition) => {
        setIsLoading(true);
        try {
          await updateMapPosition(geoPos.coords.latitude, geoPos.coords.longitude);
        } finally {
          setIsLoading(false);
        }
      };

      const error = (positionError: GeolocationPositionError) => {
        toast(`Error fetching location: ${positionError.message}`);
      };

      watchId = navigator.geolocation.watchPosition(success, error);

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }
  }, [mapType]);

  const updateMapPosition = debounce(async (latitude: number, longitude: number) => {
    if (map.current) {
      if (lastPosition && lastPosition.latitude === latitude && lastPosition.longitude === longitude) {
        return;
      }
      setLastPosition({ latitude, longitude });
      await new Promise<void>((resolve) => {
        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 12,
          essential: true,
          speed: 0.5,
          curve: 1,
        });
        map.current?.once('moveend', () => resolve());
      });
    }
  }, 300);

  const handleMapImageOverlay = async (image: string) => {
    const isMap = await detectMapImage(image);
    if (isMap) {
      const overlayData = await overlayMapImage(image);
      if (overlayData && map.current) {
        map.current.addSource('map-image-overlay', {
          type: 'image',
          url: overlayData.url,
          coordinates: overlayData.coordinates,
        });

        map.current.addLayer({
          id: 'map-image-overlay-layer',
          type: 'raster',
          source: 'map-image-overlay',
          paint: {
            'raster-opacity': 0.85,
          },
        });
      }
    }
  };

  return (
    <>
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-l-lg"
      />
      {isLoading && <p>Updating map position...</p>}
    </>
  );
};
