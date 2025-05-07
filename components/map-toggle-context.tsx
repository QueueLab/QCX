'use client'

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';

export enum MapToggleEnum {
  FreeMode,
  RealTimeMode,
  DrawingMode, // Added new mode for drawing and measurement
}

interface MapToggleContextType {
  mapType: MapToggleEnum;
  setMapType: (type: MapToggleEnum) => void;
  triggerScreenshot: () => void;
  screenshotCallback: React.MutableRefObject<(() => void) | null>;
  registerScreenshotCallback: (callback: () => void) => void;
}

const MapToggleContext = createContext<MapToggleContextType | undefined>(undefined);

interface MapToggleProviderProps {
  children: ReactNode;
}

export const MapToggleProvider: React.FC<MapToggleProviderProps> = ({ children }) => {
  const [mapToggleState, setMapToggle] = useState<MapToggleEnum>(MapToggleEnum.FreeMode);
  const screenshotCallbackRef = useRef<(() => void) | null>(null);

  const setMapType = (type: MapToggleEnum) => {
    setMapToggle(type);
  }

  const registerScreenshotCallback = (callback: () => void) => {
    screenshotCallbackRef.current = callback;
  }

  const triggerScreenshot = () => {
    if (screenshotCallbackRef.current) {
      screenshotCallbackRef.current();
    } else {
      console.warn('Screenshot callback is not registered yet');
    }
  }

  return (
    <MapToggleContext.Provider 
      value={{ 
        mapType: mapToggleState, 
        setMapType, 
        triggerScreenshot,
        screenshotCallback: screenshotCallbackRef,
        registerScreenshotCallback
      }}
    >
      {children}
    </MapToggleContext.Provider>
  );
};

export const useMapToggle = () => {
  const context = useContext(MapToggleContext);
  if (context === undefined) {
    throw new Error('map toggle context must be used within a MapToggle provider');
  }
  return context;
};