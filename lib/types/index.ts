export type SearchResults = {
  images: string[]
  results: SearchResultItem[]
  query: string
}

export type ExaSearchResults = {
  results: ExaSearchResultItem[]
}

export type SerperSearchResults = {
  searchParameters: {
    q: string
    type: string
    engine: string
  }
  videos: SerperSearchResultItem[]
}

export type SearchResultItem = {
  title: string
  url: string
  content: string
}

export type ExaSearchResultItem = {
  score: number
  title: string
  id: string
  url: string
  publishedDate: Date
  author: string
}

export type SerperSearchResultItem = {
  title: string
  link: string
  snippet: string
  imageUrl: string
  duration: string
  source: string
  channel: string
  date: string
  position: number
}

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: AIMessage[]
  sharePath?: string
}

export type AIMessage = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id: string
  name?: string
  type?:
    | 'response'
    | 'related'
    | 'skip'
    | 'inquiry'
    | 'input'
    | 'input_related'
    | 'tool'
    | 'followup'
    | 'end'
  // 'map_update' type is removed as mapData will be on currentMapTarget in AIState or directly on assistant message
  mapData?: MapData; // Using the more specific MapData type
}

// Specific MapData types
export type PointMapData = {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
  label?: string;
  placeName?: string;
  zoom?: number;
};
export type RouteMapData = {
  type: 'Route';
  geojson: any; // GeoJSON object for the route
  label?: string;
};
export type PlacesMapData = {
  type: 'Places';
  places: Array<{
    coordinates: [number, number]; // [lon, lat]
    label?: string;
    placeName?: string;
  }>;
  label?: string;
};

export type MapData = PointMapData | RouteMapData | PlacesMapData | null; // Allow null for currentMapTarget initial state
