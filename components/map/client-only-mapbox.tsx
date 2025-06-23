// components/map/client-only-mapbox.tsx
'use client';

import dynamic from 'next/dynamic';
import React from 'react'; // Import React for types like FC

// Define props type for ClientOnlyMapbox.
// This should match the props accepted by your original Mapbox component.
// Based on the earlier code, Mapbox component accepts an optional 'position' prop.
interface ClientOnlyMapboxProps {
  position?: { latitude: number; longitude: number };
  // Add any other props that the Mapbox component might expect.
  // If the props are complex or defined elsewhere, this might need adjustment.
}

// Dynamically import the actual Mapbox component from mapbox-map.tsx
const DynamicMapbox = dynamic(() =>
  import('./mapbox-map').then(mod => mod.Mapbox),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-200">
        <p className="text-gray-700">Loading map...</p>
      </div>
    ),
  }
);

const ClientOnlyMapbox: React.FC<ClientOnlyMapboxProps> = (props) => {
  return <DynamicMapbox {...props} />;
};

export default ClientOnlyMapbox;
