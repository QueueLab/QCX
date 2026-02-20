import * as turf from '@turf/turf';
import type { Position } from 'geojson';

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
}

export interface ElevationStatistics {
  min: number;
  max: number;
  average: number;
  count: number;
}

/**
 * Calculate bounding box for drawn features
 */
export function getBoundsFromFeatures(features: Array<{ geometry: any }>): [number, number, number, number] | null {
  if (!features || features.length === 0) return null;

  const allCoordinates: Position[] = [];

  features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      allCoordinates.push(...feature.geometry.coordinates[0]);
    } else if (feature.geometry.type === 'LineString') {
      allCoordinates.push(...feature.geometry.coordinates);
    }
  });

  if (allCoordinates.length === 0) return null;

  const lngs = allCoordinates.map(coord => coord[0]);
  const lats = allCoordinates.map(coord => coord[1]);

  return [
    Math.min(...lngs), // west
    Math.min(...lats), // south
    Math.max(...lngs), // east
    Math.max(...lats), // north
  ];
}

/**
 * Generate a grid of coordinates within bounds
 */
export function generateCoordinateGrid(
  bounds: [number, number, number, number], // [west, south, east, north]
  gridSize: number = 20
): Array<{ lat: number; lng: number }> {
  const [west, south, east, north] = bounds;
  const coordinates: Array<{ lat: number; lng: number }> = [];

  const latStep = (north - south) / gridSize;
  const lngStep = (east - west) / gridSize;

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      coordinates.push({
        lat: south + j * latStep,
        lng: west + i * lngStep,
      });
    }
  }

  return coordinates;
}

/**
 * Decode Mapbox Terrain-RGB elevation
 * Formula: -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
 */
export function decodeMapboxTerrainRGB(r: number, g: number, b: number): number {
  return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

/**
 * Get color for elevation value in heatmap
 */
export function getElevationColor(
  elevation: number,
  min: number,
  max: number
): string {
  const normalized = (elevation - min) / (max - min);

  // Color scale: blue -> cyan -> green -> yellow -> red
  if (normalized < 0.25) {
    // Blue to cyan
    const t = normalized / 0.25;
    return `rgb(${Math.round(33 + (103-33) * t)}, ${Math.round(102 + (169-102) * t)}, ${Math.round(172 + (207-172) * t)})`;
  } else if (normalized < 0.5) {
    // Cyan to green
    const t = (normalized - 0.25) / 0.25;
    return `rgb(${Math.round(103 + (209-103) * t)}, ${Math.round(169 + (229-169) * t)}, ${Math.round(207 + (240-207) * t)})`;
  } else if (normalized < 0.75) {
    // Green to yellow
    const t = (normalized - 0.5) / 0.25;
    return `rgb(${Math.round(209 + (253-209) * t)}, ${Math.round(229 + (219-229) * t)}, ${Math.round(240 + (199-240) * t)})`;
  } else {
    // Yellow to red
    const t = (normalized - 0.75) / 0.25;
    return `rgb(${Math.round(253 + (178-253) * t)}, ${Math.round(219 + (24-219) * t)}, ${Math.round(199 + (43-199) * t)})`;
  }
}

/**
 * Get elevation statistics from points
 */
export function getElevationStats(points: ElevationPoint[]): ElevationStatistics {
  if (!points || points.length === 0) {
    return { min: 0, max: 0, average: 0, count: 0 };
  }

  const elevations = points.map(p => p.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const average = elevations.reduce((sum, e) => sum + e, 0) / elevations.length;

  return { min, max, average, count: points.length };
}
