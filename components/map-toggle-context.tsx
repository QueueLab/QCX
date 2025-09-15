'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

export enum MapToggleEnum {
  FreeMode,
  RealTimeMode,
  DrawingMode, // Added new mode for drawing and measurement
  WebcamMode,
}

interface MapToggleContextType {
  mapType: MapToggleEnum;
  setMapType: (type: MapToggleEnum) => void;
}

const MapToggleContext = createContext<MapToggleContextType | undefined>(undefined);

interface MapToggleProviderProps {
  children: ReactNode;
}

export const MapToggleProvider: React.FC<MapToggleProviderProps> = ({ children }) => {
  const [mapToggleState, setMapToggle] = useState<MapToggleEnum>(MapToggleEnum.FreeMode);

  const setMapType = (type: MapToggleEnum) => {
    setMapToggle(type);
  }

  return (
    <MapToggleContext.Provider value={{ mapType: mapToggleState, setMapType }}>
      {children}
    </MapToggleContext.Provider>
  );
};

export const useMapToggle = () => {
  const context = useContext(MapToggleContext);
  if (context === undefined) {
    throw new Error('map toogle context must be used within an map toggle provider');
  }
  return context;
};
