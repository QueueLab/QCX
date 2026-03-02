'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type { FeatureCollection } from 'geojson'

const GeoJsonLayer = dynamic(() => import('./geojson-layer').then(mod => mod.GeoJsonLayer), { ssr: false })
const ElevationHeatmapLayer = dynamic(() => import('./elevation-heatmap-layer').then(mod => mod.ElevationHeatmapLayer), { ssr: false })

interface MapResultsContainerProps {
  id: string
  geoJson?: FeatureCollection
  elevationPoints?: {
    points: any[]
    statistics: any
  }
}

export function MapResultsContainer({ id, geoJson, elevationPoints }: MapResultsContainerProps) {
  return (
    <>
      {geoJson && <GeoJsonLayer id={id} data={geoJson} />}
      {elevationPoints && elevationPoints.points && elevationPoints.points.length > 0 && (
        <ElevationHeatmapLayer
          id={`${id}-elevation`}
          points={elevationPoints.points}
          statistics={elevationPoints.statistics}
        />
      )}
    </>
  )
}
