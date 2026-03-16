'use client'

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo
} from 'react'

export interface MapData {
  drawnFeatures: any[]
  cameraState?: {
    center: [number, number]
    zoom: number
    pitch: number
    bearing: number
  }
}

interface MapDataContextType {
  mapData: MapData
  setMapData: React.Dispatch<React.SetStateAction<MapData>>
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined)

export const MapDataProvider = ({ children }: { children: ReactNode }) => {
  const [mapData, setMapData] = useState<MapData>({
    drawnFeatures: []
  })

  // ⚡ Bolt: Memoize the context value to prevent all consumers from re-rendering
  // whenever the MapDataProvider's parent re-renders.
  const value = useMemo(
    () => ({
      mapData,
      setMapData
    }),
    [mapData]
  )

  return (
    <MapDataContext.Provider value={value}>
      {children}
    </MapDataContext.Provider>
  )
}

export const useMapData = () => {
  const context = useContext(MapDataContext)
  if (context === undefined) {
    throw new Error('useMapData must be used within a MapDataProvider')
  }
  return context
}
