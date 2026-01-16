'use client';

import React, { useEffect } from 'react';
import { useMapData } from './map-data-context';

interface CoordinateLinkProps {
  lat: number;
  lng: number;
  label?: string;
}

export const CoordinateLink: React.FC<CoordinateLinkProps> = ({ lat, lng, label }) => {
  const { setMapData } = useMapData();
  const id = `${lat},${lng}`;

  useEffect(() => {
    // Automatically add marker and pan to it when the component mounts
    setMapData(prev => {
      const exists = prev.markers?.some(m => m.id === id);
      const newMarkers = exists ? prev.markers : [...(prev.markers || []), { id, latitude: lat, longitude: lng, title: label || id }];

      return {
        ...prev,
        targetPosition: { lat, lng },
        markers: newMarkers
      };
    });
  }, [lat, lng, id, label, setMapData]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMapData(prev => ({
      ...prev,
      targetPosition: { lat, lng }
    }));
  };

  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="text-accent-foreground underline decoration-dotted hover:text-primary transition-colors cursor-pointer"
    >
      {label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
    </a>
  );
};
