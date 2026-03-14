import * as turf from '@turf/turf';
import type { Position } from 'geojson';

/**
 * Calculate bounding box for drawn features
 */
export function getBoundsFromFeatures(features: Array<{ geometry: any }>): [number, number, number, number] | null {
  if (!features || features.length === 0) return null;

  const allCoordinates: Position[] = [];

  features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      // Handle MultiPolygon if necessary, but standard Draw is Polygon
      feature.geometry.coordinates.forEach((ring: Position[]) => {
        allCoordinates.push(...ring);
      });
    } else if (feature.geometry.type === 'LineString') {
      allCoordinates.push(...feature.geometry.coordinates);
    } else if (feature.geometry.type === 'Point') {
      allCoordinates.push(feature.geometry.coordinates);
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
 * Decode Mapbox Terrain-RGB elevation
 * Elevation formula: -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
 */
export function decodeMapboxTerrainRGB(r: number, g: number, b: number): number {
  return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

/**
 * Generate elevation color based on value
 * This is used for fallback or individual point styling if needed
 */
export function getElevationColor(elevation: number, min: number, max: number): string {
  const normalized = (elevation - min) / (max - min || 1);

  // Color scale: blue -> cyan -> green -> yellow -> red
  if (normalized < 0.25) {
    const t = normalized * 4;
    return `rgb(${Math.round(33 + (103-33) * t)}, ${Math.round(102 + (169-102) * t)}, 172)`;
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) * 4;
    return `rgb(${Math.round(103 + (209-103) * t)}, ${Math.round(169 + (229-169) * t)}, ${Math.round(207 + (240-207) * t)})`;
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) * 4;
    return `rgb(${Math.round(209 + (253-209) * t)}, ${Math.round(229 + (219-229) * t)}, ${Math.round(240 + (199-240) * t)})`;
  } else {
    const t = (normalized - 0.75) * 4;
    return `rgb(${Math.round(253 + (178-253) * t)}, ${Math.round(219 + (24-219) * t)}, ${Math.round(199 + (43-199) * t)})`;
  }
}
