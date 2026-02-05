'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the context
interface GeospatialModelContextType {
  isGeospatialModelEnabled: boolean;
  toggleGeospatialModel: () => void;
}

// Create the context with a default value
const GeospatialModelContext = createContext<GeospatialModelContextType | undefined>(undefined);

// Create the provider component
export const GeospatialModelProvider = ({ children }: { children: ReactNode }) => {
  const [isGeospatialModelEnabled, setIsGeospatialModelEnabled] = useState(false);

  const toggleGeospatialModel = () => {
    setIsGeospatialModelEnabled(prevState => !prevState);
  };

  return (
    <GeospatialModelContext.Provider value={{ isGeospatialModelEnabled, toggleGeospatialModel }}>
      {children}
    </GeospatialModelContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useGeospatialModel = () => {
  const context = useContext(GeospatialModelContext);
  if (context === undefined) {
    throw new Error('useGeospatialModel must be used within a GeospatialModelProvider');
  }
  return context;
};