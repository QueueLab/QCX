export interface DrawnFeature {
  id: string;
  type: 'Polygon' | 'LineString';
  measurement: string;
  geometry: any;
}

export interface Location {
  latitude?: number;
  longitude?: number;
  place_name?: string;
  address?: string;
}

export interface McpResponse {
  location: Location;
  mapUrl?: string;
}
