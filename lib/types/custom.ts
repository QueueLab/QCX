// Defines the structure for a map command, like 'flyTo' or 'easeTo'.
export interface MapCommand {
  command: 'flyTo' | 'easeTo' | 'fitBounds'; // Add other valid map commands as needed
  params: any; // Parameters for the command, e.g., { center: [lon, lat], zoom: 10 }
}

// Defines the structure for the geometry part of a GeoJSON feature.
export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon'; // Can be extended with other GeoJSON geometry types
  coordinates: number[] | number[][] | number[][][];
}

// Defines a single feature in a GeoJSON FeatureCollection.
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: {
    [key: string]: any; // Features can have any number of properties
  };
}

// Defines the structure for a GeoJSON FeatureCollection.
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Defines the structured response that includes textual data, GeoJSON, and map commands.
export interface LocationResponse {
  text: string;
  geojson: GeoJSONFeatureCollection | null;
  map_commands?: MapCommand[] | null;
}