import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useMapToggle, MapToggleEnum } from '../map-toggle-context';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{ position: { latitude: number; longitude: number; } }> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { mapType } = useMapToggle();
  const [isLoading, setIsLoading] = useState(false);

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
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapContainer]);

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

  const updateMapPosition = async (latitude: number, longitude: number) => {
    if (map.current) {
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
  };

  // Add functionality to link location names to map rendering
  useEffect(() => {
    window.renderMapToLocation = (latitude: number, longitude: number) => {
      updateMapPosition(latitude, longitude);
    };
  }, []);

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
