'use client'

import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import * as turf from '@turf/turf'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useMapToggle, MapToggleEnum } from '../map-toggle-context'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const naturalWonders = [
  { name: 'Mount Everest', coordinates: { latitude: 27.9881, longitude: 86.9250 } },
  { name: 'Grand Canyon', coordinates: { latitude: 36.1069, longitude: -112.1129 } },
  { name: 'Great Barrier Reef', coordinates: { latitude: -18.2871, longitude: 147.6992 } },
  { name: 'Aurora Borealis', coordinates: { latitude: 67.8558, longitude: 20.2253 } },
  { name: 'Victoria Falls', coordinates: { latitude: -17.9243, longitude: 25.8567 } },
  { name: 'Paricutin Volcano', coordinates: { latitude: 19.4933, longitude: -102.2514 } },
  { name: 'Harbor of Rio de Janeiro', coordinates: { latitude: -22.9519, longitude: -43.2105 } }
];

export const Mapbox: React.FC<{ position: { latitude: number; longitude: number; } }> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null);
  const { mapType } = useMapToggle();
  const [roundedArea, setRoundedArea] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWonderIndex, setCurrentWonderIndex] = useState(0);
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);

  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true
    },
    defaultMode: 'draw_polygon'
  });

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

      const error = (error: GeolocationPositionError) => {
        console.error('Geolocation Error:', error.message);
        toast.error(`Location error: ${error.message}`);
      }
      watchId = navigator.geolocation.watchPosition(success, error)

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

  const rotateToNextWonder = () => {
    const nextIndex = (currentWonderIndex + 1) % naturalWonders.length;
    setCurrentWonderIndex(nextIndex);
    const nextWonder = naturalWonders[nextIndex];
    updateMapPosition(nextWonder.coordinates.latitude, nextWonder.coordinates.longitude);
  };

  const resetIdleTimeout = () => {
    if (idleTimeout.current) {
      clearTimeout(idleTimeout.current);
    }
    idleTimeout.current = setTimeout(() => {
      rotateToNextWonder();
    }, 5000); // 5 seconds of idle time before rotating
  };

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
        attributionControl: true
      })

      // actions
      const updateArea = (event: MapboxDraw.DrawCreateEvent | MapboxDraw.DrawUpdateEvent) => {
        const { features } = event;
        const allDrawnFeatures = draw.getAll();
        if (features && features.length > 0) {
          const polygon = features[0];
          console.log('Polygon created:', polygon);
          const area = turf.area(allDrawnFeatures);
          setRoundedArea(Math.round(area * 100) / 100);
        }
      };
      // Add zoom controls
      if (map.current) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(draw, 'top-right');
        map.current.on('draw.create', updateArea);
        map.current.on('draw.delete', updateArea);
        map.current.on('draw.update', updateArea);
        map.current.on('idle', resetIdleTimeout);
        map.current.on('move', resetIdleTimeout);
      }
      // Add terrain
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
      if (idleTimeout.current) {
        clearTimeout(idleTimeout.current);
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

  return (
    <div className="h-full w-full overflow-hidden rounded-l-lg">
      <div
        className="w=full h-full"
        ref={mapContainer}
      />
      {isLoading && <p>Updating map position...</p>}
      <div className="absolute bottom-10 left-10 h-30 w-48 bg-white bg-opacity-80 p-3.5 text-center rounded-lg !text-black">
        <p>Draw Area</p>
        <div>
          {
            roundedArea && (
              <>
                <p>
                  <strong>{roundedArea}</strong>
                </p>
                <p>square meters</p>
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}
