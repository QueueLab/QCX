// Re-export types from map-schemas for backward compatibility
export type {
  MapCommand,
  GeoJSONGeometry,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  LocationResponse,
} from './map-schemas';

// Legacy interfaces kept for backward compatibility (deprecated - use map-schemas instead)
// These are now just type aliases to the new schemas