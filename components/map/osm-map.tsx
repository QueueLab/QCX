'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import * as turf from '@turf/turf'
import { useMapData } from './map-data-context'
import { useMapLoading } from '../map-loading-context'
import './osm-map.css'

// Leaflet's default icon path is not set up correctly in Next.js by default.
// This fix ensures that the marker icons are loaded correctly.
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
  iconUrl: require('leaflet/dist/images/marker-icon.png').default,
  shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
})

// Formats the area or distance for display, consistent with other map components.
const formatMeasurement = (value: number, isArea = true) => {
  if (isArea) {
    return value >= 1000000
      ? `${(value / 1000000).toFixed(2)} km²`
      : `${value.toFixed(2)} m²`
  } else {
    return value >= 1000
      ? `${(value / 1000).toFixed(2)} km`
      : `${value.toFixed(0)} m`
  }
}

const DrawControl = () => {
  const map = useMap()
  const { setMapData } = useMapData()
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup())
  const labelsRef = useRef<{ [id: number]: L.Marker }>({})

  const updateMeasurementLabels = useCallback(() => {
    const layers = featureGroupRef.current.getLayers() as (L.Polygon | L.Polyline)[]
    const currentDrawnFeatures: any[] = []

    // Clear existing labels
    Object.values(labelsRef.current).forEach(marker => marker.remove())
    labelsRef.current = {}

    layers.forEach(layer => {
      const id = L.Util.stamp(layer)
      const geojson = layer.toGeoJSON()
      let measurement = ''
      let labelPos: L.LatLngExpression | undefined

      if (geojson.geometry.type === 'Polygon') {
        const area = turf.area(geojson)
        measurement = formatMeasurement(area, true)
        const center = turf.centroid(geojson)
        labelPos = [center.geometry.coordinates[1], center.geometry.coordinates[0]]
      } else if (geojson.geometry.type === 'LineString') {
        const length = turf.length(geojson, { units: 'meters' })
        measurement = formatMeasurement(length, false)
        const line = geojson.geometry.coordinates
        const midpoint = line[Math.floor(line.length / 2)]
        labelPos = [midpoint[1], midpoint[0]]
      }

      if (measurement && labelPos) {
        const label = L.marker(labelPos, {
          icon: L.divIcon({
            className: 'leaflet-measurement-label',
            html: `<span>${measurement}</span>`,
          }),
        }).addTo(map)
        labelsRef.current[id] = label
      }

      currentDrawnFeatures.push({
        id: id.toString(),
        type: geojson.geometry.type,
        measurement,
        geometry: geojson.geometry,
      });
    })

    setMapData(prev => ({ ...prev, drawnFeatures: currentDrawnFeatures }))
  }, [map, setMapData])

  useEffect(() => {
    const featureGroup = featureGroupRef.current
    map.addLayer(featureGroup)

    const drawControl = new L.Control.Draw({
      edit: { featureGroup },
      draw: {
        polygon: true,
        polyline: true,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    })
    map.addControl(drawControl)

    const onDrawCreated = (e: any) => {
      const layer = e.layer
      featureGroup.addLayer(layer)
      updateMeasurementLabels()
    }

    const onDrawEdited = () => updateMeasurementLabels()
    const onDrawDeleted = () => updateMeasurementLabels()

    map.on(L.Draw.Event.CREATED, onDrawCreated)
    map.on(L.Draw.Event.EDITED, onDrawEdited)
    map.on(L.Draw.Event.DELETED, onDrawDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, onDrawCreated)
      map.off(L.Draw.Event.EDITED, onDrawEdited)
      map.off(L.Draw.Event.DELETED, onDrawDeleted)
      if (map.hasLayer(featureGroup)) {
        map.removeLayer(featureGroup)
      }
      map.removeControl(drawControl)
    }
  }, [map, updateMeasurementLabels])

  return null
}

export function OSMMap() {
  const { mapData, setMapData } = useMapData()
  const { setIsMapLoaded } = useMapLoading()
  const mapRef = useRef<L.Map>(null)

  const initialCenter = mapData.cameraState
    ? [mapData.cameraState.center.lat, mapData.cameraState.center.lng] as [number, number]
    : ([51.505, -0.09] as [number, number])
  const initialZoom = mapData.cameraState ? mapData.cameraState.zoom : 13

  useEffect(() => {
    setIsMapLoaded(true)
    return () => setIsMapLoaded(false)
  }, [setIsMapLoaded])

  const handleMapMoveEnd = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current
      const center = map.getCenter()
      const zoom = map.getZoom()
      setMapData(prev => ({
        ...prev,
        cameraState: {
          ...prev.cameraState,
          center: { lat: center.lat, lng: center.lng },
          zoom,
        },
      }))
    }
  }, [setMapData])

  return (
    <>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        ref={mapRef}
        whenReady={() => handleMapMoveEnd()} // Initial camera state
        onMoveEnd={handleMapMoveEnd}
        onZoomEnd={handleMapMoveEnd}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup>
          <DrawControl />
        </FeatureGroup>
      </MapContainer>
    </>
  )
}
