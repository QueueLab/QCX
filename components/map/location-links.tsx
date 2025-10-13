'use client';

import { useMapData } from './map-data-context';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface Location {
  latitude: number;
  longitude: number;
  place_name: string;
}

interface LocationLinksProps {
  locations: Location[];
}

export const LocationLinks: React.FC<LocationLinksProps> = ({ locations }) => {
  const { setMapData } = useMapData();

  const handleFlyTo = (location: Location) => {
    setMapData(prevData => ({
      ...prevData,
      targetPosition: [location.longitude, location.latitude],
      mapFeature: {
        place_name: location.place_name,
      }
    }));
  };

  return (
    <div className="flex flex-col space-y-2">
      {locations.map((location, index) => (
        <Button
          key={index}
          variant="outline"
          className="justify-start"
          onClick={() => handleFlyTo(location)}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {location.place_name}
        </Button>
      ))}
    </div>
  );
};
