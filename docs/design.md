# Multi-Agent Architecture Design for Autonomous Map Control

## Architecture Overview

**Pattern**: Orchestrator-Worker with Feedback Loops and Routing

This design combines multiple AI SDK patterns to create an autonomous map control system that can:
- Parse and validate geographic data
- Generate appropriate map commands
- Receive feedback from the map
- Adjust behavior based on map state
- Query Mapbox MCP for additional context

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Query                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Researcher Agent (existing)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Map Control Orchestrator Agent                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - Routes to appropriate workers                          │  │
│  │  - Manages feedback loops                                 │  │
│  │  - Coordinates multi-step operations                      │  │
│  │  - Queries Mapbox MCP for context                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  GeoJSON    │    │   Map       │    │  Validator  │        │
│  │  Parser     │    │  Command    │    │  Worker     │        │
│  │  Worker     │    │  Generator  │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ LocationResponse │
                    └─────────┬────────┘
                              │
                              ▼
                ┌──────────────────────────────┐
                │ LocationResponseHandler       │
                └─────────┬────────────────────┘
                          │
                          ▼
                ┌──────────────────────────────┐
                │    MapDataContext            │
                └─────────┬────────────────────┘
                          │
                          ▼
                ┌──────────────────────────────┐
                │    Mapbox Component          │
                │  (executes commands)         │
                └─────────┬────────────────────┘
                          │
                          ▼ (feedback)
                ┌──────────────────────────────┐
                │  Map State Feedback          │
                │  - Current bounds            │
                │  - Zoom level                │
                │  - Center position           │
                │  - Visible features          │
                └─────────┬────────────────────┘
                          │
                          ▼
                ┌──────────────────────────────┐
                │  Feedback Analyzer Worker    │
                │  (processes map state)       │
                └─────────┬────────────────────┘
                          │
                          └──────────► Orchestrator (loop)
```

## Component Specifications

### 1. Map Control Orchestrator Agent

**File**: `lib/agents/map-control-orchestrator.tsx`

**Responsibilities**:
- Receive researcher response text
- Classify the type of map operation needed (routing pattern)
- Coordinate worker agents
- Query Mapbox MCP for additional context
- Manage feedback loops
- Make multi-step decisions

**Workflow**:
```typescript
1. Classify query type:
   - Simple location display
   - Route/distance calculation
   - Multi-location visualization
   - Complex map operation

2. Route to appropriate workers based on classification

3. If needed, query Mapbox MCP for:
   - Geocoding
   - Distance calculation
   - Nearby places
   - Current map state

4. Collect worker outputs

5. Validate and combine results

6. If feedback indicates issues, refine and retry

7. Return final LocationResponse
```

**Key Features**:
- Uses `generateObject` with routing logic
- Integrates with Mapbox MCP client
- Supports multi-step operations (maxSteps)
- Implements retry logic with feedback

### 2. GeoJSON Parser Worker

**File**: `lib/agents/map-workers/geojson-parser.tsx`

**Responsibilities**:
- Extract geographic data from text
- Convert to valid GeoJSON format
- Validate with Zod schema
- Handle multiple feature types

**Input**: Text containing location information
**Output**: Validated GeoJSON FeatureCollection

**Zod Schema**:
```typescript
const GeoJSONGeometrySchema = z.object({
  type: z.enum(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']),
  coordinates: z.union([
    z.array(z.number()), // Point
    z.array(z.array(z.number())), // LineString, MultiPoint
    z.array(z.array(z.array(z.number()))), // Polygon, MultiLineString
  ]),
});

const GeoJSONFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeoJSONGeometrySchema,
  properties: z.record(z.any()),
});

const GeoJSONFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONFeatureSchema),
});
```

### 3. Map Command Generator Worker

**File**: `lib/agents/map-workers/map-command-generator.tsx`

**Responsibilities**:
- Generate appropriate map commands based on context
- Consider current map state
- Optimize camera movements
- Handle multiple commands in sequence

**Input**: 
- Text description
- GeoJSON features
- Current map state (optional)

**Output**: Array of MapCommand objects

**Command Types**:
```typescript
interface MapCommand {
  command: 'flyTo' | 'easeTo' | 'fitBounds' | 'setCenter' | 'setZoom';
  params: {
    center?: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    bounds?: [[number, number], [number, number]];
    duration?: number;
    essential?: boolean;
  };
  priority?: number; // For sequencing
  condition?: string; // Optional condition for execution
}
```

**Zod Schema**:
```typescript
const MapCommandSchema = z.object({
  command: z.enum(['flyTo', 'easeTo', 'fitBounds', 'setCenter', 'setZoom']),
  params: z.object({
    center: z.tuple([z.number(), z.number()]).optional(),
    zoom: z.number().min(0).max(22).optional(),
    pitch: z.number().min(0).max(85).optional(),
    bearing: z.number().min(0).max(360).optional(),
    bounds: z.tuple([
      z.tuple([z.number(), z.number()]),
      z.tuple([z.number(), z.number()])
    ]).optional(),
    duration: z.number().optional(),
    essential: z.boolean().optional(),
  }),
  priority: z.number().optional(),
  condition: z.string().optional(),
});
```

### 4. Validator Worker

**File**: `lib/agents/map-workers/validator.tsx`

**Responsibilities**:
- Validate GeoJSON structure
- Validate map commands
- Check coordinate validity
- Ensure data quality

**Validation Checks**:
- Longitude: -180 to 180
- Latitude: -90 to 90
- Zoom: 0 to 22
- GeoJSON structure compliance
- Command parameter completeness

### 5. Feedback Analyzer Worker

**File**: `lib/agents/map-workers/feedback-analyzer.tsx`

**Responsibilities**:
- Process map state feedback
- Determine if commands were successful
- Identify issues or errors
- Suggest refinements

**Input**: Map state feedback
```typescript
interface MapStateFeedback {
  success: boolean;
  currentBounds?: [[number, number], [number, number]];
  currentCenter?: [number, number];
  currentZoom?: number;
  visibleFeatures?: string[];
  error?: string;
  timestamp: number;
}
```

**Output**: Analysis and recommendations
```typescript
interface FeedbackAnalysis {
  status: 'success' | 'partial' | 'failed';
  issues: string[];
  recommendations: {
    action: 'retry' | 'refine' | 'abort' | 'continue';
    modifications?: Partial<MapCommand>[];
  };
}
```

## Data Flow

### Initial Request Flow

1. User query → Researcher agent → text response
2. Text response → Map Control Orchestrator
3. Orchestrator classifies query type
4. Orchestrator may query Mapbox MCP for context:
   - Geocode addresses
   - Calculate distances
   - Search nearby places
5. Orchestrator routes to workers in parallel:
   - GeoJSON Parser extracts features
   - Map Command Generator creates commands
6. Validator checks all outputs
7. Orchestrator combines results into LocationResponse
8. LocationResponse → LocationResponseHandler → MapDataContext
9. Mapbox component receives data and executes commands

### Feedback Loop Flow

1. Mapbox component executes commands
2. Map state changes captured
3. MapStateFeedback sent to Feedback Analyzer
4. Feedback Analyzer processes state
5. If issues detected:
   - Analysis sent back to Orchestrator
   - Orchestrator refines approach
   - New commands generated
   - Loop continues (max 3 iterations)
6. If successful:
   - Loop terminates
   - Final state confirmed

## Integration Points

### Mapbox MCP Integration

The orchestrator will use the existing Mapbox MCP client for:

```typescript
// In orchestrator
const mcpClient = useMcp({
  url: `https://server.smithery.ai/@Waldzell-Agentics/mcp-server/mcp?profile=${profileId}&api_key=${apiKey}`,
  autoReconnect: true,
});

// Query for geocoding
const locationData = await mcpClient.callTool('geocode_location', {
  query: extractedAddress,
  includeMapPreview: true,
});

// Query for distance
const distanceData = await mcpClient.callTool('calculate_distance', {
  from: location1,
  to: location2,
  profile: 'driving',
});

// Query for nearby places
const placesData = await mcpClient.callTool('search_nearby_places', {
  location: centerPoint,
  query: 'restaurants',
  radius: 1000,
});
```

### Feedback Mechanism

Add to MapDataContext:

```typescript
interface MapData {
  targetPosition?: LngLatLike | null;
  mapFeature?: any | null;
  drawnFeatures?: Array<{...}>;
  geojson?: GeoJSONFeatureCollection | null;
  mapCommands?: MapCommand[] | null;
  
  // NEW: Feedback mechanism
  mapStateFeedback?: MapStateFeedback | null;
  feedbackCallback?: (feedback: MapStateFeedback) => void;
}
```

Add to Mapbox component:

```typescript
// After command execution
useEffect(() => {
  if (mapData.mapCommands && map.current) {
    // Execute commands...
    
    // Capture feedback
    map.current.once('moveend', () => {
      const feedback: MapStateFeedback = {
        success: true,
        currentBounds: map.current.getBounds().toArray(),
        currentCenter: [map.current.getCenter().lng, map.current.getCenter().lat],
        currentZoom: map.current.getZoom(),
        timestamp: Date.now(),
      };
      
      // Send feedback via callback
      if (mapData.feedbackCallback) {
        mapData.feedbackCallback(feedback);
      }
    });
  }
}, [mapData.mapCommands]);
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Create Zod schemas for validation
2. Set up worker agent structure
3. Implement basic orchestrator

### Phase 2: Worker Agents
1. Implement GeoJSON Parser with validation
2. Implement Map Command Generator
3. Implement Validator
4. Implement Feedback Analyzer

### Phase 3: Orchestrator Logic
1. Add classification/routing logic
2. Integrate Mapbox MCP client
3. Implement worker coordination
4. Add feedback loop management

### Phase 4: Integration
1. Update LocationResponseHandler
2. Add feedback mechanism to MapDataContext
3. Update Mapbox component for feedback
4. Wire up complete flow

### Phase 5: Testing & Refinement
1. Test with various query types
2. Test feedback loops
3. Test MCP integration
4. Optimize performance
5. Add error recovery

## Benefits of This Architecture

1. **Modularity**: Each worker is specialized and independent
2. **Scalability**: Easy to add new worker types
3. **Reliability**: Validation and feedback loops ensure quality
4. **Autonomy**: Can handle complex multi-step operations
5. **Adaptability**: Feedback allows dynamic adjustment
6. **Context-Aware**: MCP integration provides real-time data
7. **Maintainability**: Clear separation of concerns
8. **Testability**: Each component can be tested independently

## Next Steps

1. Implement Zod schemas
2. Create worker agent files
3. Build orchestrator with routing logic
4. Add feedback mechanism
5. Test integration
6. Document usage
