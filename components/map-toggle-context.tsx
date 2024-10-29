'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useTheme } from 'next-themes';

export enum MapToggleEnum {
  FreeMode,
  RealTimeMode,
}

interface MapToggleContextType {
  mapType: MapToggleEnum;
  setMapType: (type: MapToggleEnum) => void;
  theme: string | undefined;
  is3DPreviewEnabled: boolean;
  set3DPreviewEnabled: (enabled: boolean) => void;
}

const MapToggleContext = createContext<MapToggleContextType | undefined>(undefined);

interface MapToggleProviderProps {
  children: ReactNode;
}

export const MapToggleProvider: React.FC<MapToggleProviderProps> = ({ children }) => {
  const [mapToggleState, setMapToggle] = useState<MapToggleEnum>(MapToggleEnum.FreeMode);
  const { theme } = useTheme();
  const [is3DPreviewEnabled, set3DPreviewEnabled] = useState(false);

  const setMapType = (type: MapToggleEnum) => {
    setMapToggle(type);
  }

  return (
    <MapToggleContext.Provider value={{ mapType: mapToggleState, setMapType, theme, is3DPreviewEnabled, set3DPreviewEnabled }}>
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
