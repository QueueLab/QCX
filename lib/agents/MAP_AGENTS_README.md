# Multi-Agent Map Control Architecture

## Overview

This directory contains a sophisticated multi-agent system for autonomous map control with Mapbox MCP feedback integration. The architecture implements the **Orchestrator-Worker pattern with Feedback Loops** from the AI SDK, providing intelligent, adaptive map operations.

## Architecture

```
User Query → Researcher → Map Control Orchestrator ←→ Mapbox MCP
                                  ↓
                    ┌─────────────┼─────────────┐
                    ↓             ↓             ↓
              GeoJSON Parser  Map Command   Validator
                Worker        Generator      Worker
                    ↓             ↓             ↓
                    └─────────────┴─────────────┘
                                  ↓
                          LocationResponse
                                  ↓
                          Mapbox Component
                                  ↓
                          Feedback Loop
                                  ↓
                      Feedback Analyzer Worker
                                  ↓
                    Orchestrator (refine/retry)
```

## Components

### 1. Map Control Orchestrator (`map-control-orchestrator.tsx`)

**Main coordinator** that:
- Classifies query types (simple location, route, multi-location, etc.)
- Routes work to appropriate worker agents
- Queries Mapbox MCP for geocoding and map data
- Manages feedback loops (up to 3 iterations)
- Coordinates multi-step operations

**Usage:**
```typescript
import { mapControlOrchestrator } from './map-control-orchestrator';

const response = await mapControlOrchestrator(researcherText, {
  maxIterations: 3,
  enableFeedbackLoop: true,
  mcpClient: mcpClientInstance,
});
```

### 2. Worker Agents

#### GeoJSON Parser (`map-workers/geojson-parser.tsx`)
- Extracts geographic data from text
- Converts to valid GeoJSON format
- Validates with Zod schemas
- Returns confidence scores
- Identifies locations needing geocoding

#### Map Command Generator (`map-workers/map-command-generator.tsx`)
- Generates appropriate Mapbox camera commands
- Considers context and user intent
- Optimizes for user experience
- Supports: flyTo, easeTo, fitBounds, setCenter, setZoom, setPitch, setBearing
- Provides reasoning for each command

#### Validator (`map-workers/validator.tsx`)
- Validates GeoJSON structure with Zod
- Validates map commands
- Checks coordinate validity
- Ensures data quality
- Returns detailed error messages

#### Feedback Analyzer (`map-workers/feedback-analyzer.tsx`)
- Analyzes map state feedback
- Determines success/failure
- Recommends actions: continue, retry, refine, abort
- Suggests command modifications
- Prevents infinite loops (max 3 attempts)

### 3. Type Schemas (`/lib/types/map-schemas.ts`)

Comprehensive Zod schemas for:
- GeoJSON geometries (Point, LineString, Polygon, Multi*)
- Map commands and parameters
- Map state feedback
- Feedback analysis
- Worker outputs
- Location responses

All with strict validation rules:
- Longitude: -180 to 180
- Latitude: -90 to 90
- Zoom: 0 to 22
- Pitch: 0 to 85°
- Bearing: 0 to 360°

### 4. Enhanced Enricher (`geojson-enricher-v2.tsx`)

Drop-in replacement for the original `geojsonEnricher`:
```typescript
import { geojsonEnricherV2 } from './geojson-enricher-v2';

// With MCP client
const response = await geojsonEnricherV2(text, mcpClient);

// Without MCP client (backward compatible)
const response = await geojsonEnricherV2(text);
```

## Integration Points

### 1. Map Data Context (`components/map/map-data-context.tsx`)

Enhanced with feedback mechanism:
```typescript
interface MapData {
  // ... existing fields
  mapStateFeedback?: MapStateFeedback | null;
  feedbackCallback?: (feedback: MapStateFeedback) => void;
}
```

### 2. Mapbox Component (`components/map/mapbox-map.tsx`)

Now captures and sends feedback after command execution:
- Monitors command execution
- Captures map state (center, zoom, bounds, pitch, bearing)
- Sends feedback via callback
- Stores feedback in context
- Handles execution errors

### 3. Actions Integration (`app/actions.tsx`)

Update the submit function to use the new enricher:

```typescript
// Replace old geojsonEnricher import
import { geojsonEnricherV2 } from '@/lib/agents/geojson-enricher-v2';

// In submit function, replace:
const locationResponse = await geojsonEnricher(answer);

// With:
const locationResponse = await geojsonEnricherV2(answer, mcpClient);
```

## Features

### ✅ Intelligent Classification
- Automatically determines query type
- Routes to appropriate processing pipeline
- Optimizes MCP usage

### ✅ Robust Validation
- Zod schema validation for all data
- Coordinate range checking
- GeoJSON structure validation
- Command parameter validation

### ✅ Feedback Loops
- Captures map state after operations
- Analyzes success/failure
- Automatically refines commands
- Prevents infinite loops

### ✅ MCP Integration
- Geocodes addresses automatically
- Calculates distances and routes
- Searches nearby places
- Generates map links

### ✅ Error Recovery
- Graceful fallbacks on errors
- Retry logic with exponential backoff
- Detailed error messages
- Maintains system stability

### ✅ Observability
- Console logging at each step
- Performance metrics
- Confidence scores
- Iteration tracking

## Query Examples

### Simple Location
```
"Show me the Eiffel Tower"
```
→ Classifies as `simple_location`
→ Geocodes if needed
→ Generates `flyTo` command with appropriate zoom

### Route/Distance
```
"What's the distance from New York to Boston?"
```
→ Classifies as `route_distance`
→ Queries MCP for distance calculation
→ Generates `fitBounds` to show entire route

### Multi-Location
```
"Show Tokyo, London, and Paris on the map"
```
→ Classifies as `multi_location`
→ Geocodes all three cities
→ Generates `fitBounds` to show all locations

### Nearby Search
```
"Find restaurants near Times Square"
```
→ Classifies as `nearby_search`
→ Geocodes Times Square
→ Queries MCP for nearby restaurants
→ Generates appropriate commands

## Configuration

### Orchestrator Options

```typescript
interface OrchestratorOptions {
  maxIterations?: number;        // Default: 3
  enableFeedbackLoop?: boolean;  // Default: true
  mcpClient?: any;               // Optional MCP client
}
```

### Environment Variables

Required for MCP integration:
- `NEXT_PUBLIC_SMITHERY_PROFILE_ID`
- `NEXT_PUBLIC_SMITHERY_API_KEY`

## Testing

### Unit Testing Workers

```typescript
import { geojsonParser } from './map-workers/geojson-parser';

const result = await geojsonParser("Show me Paris at 48.8566° N, 2.3522° E");
expect(result.geojson).toBeTruthy();
expect(result.confidence).toBeGreaterThan(0.8);
```

### Integration Testing

```typescript
import { mapControlOrchestrator } from './map-control-orchestrator';

const response = await mapControlOrchestrator("Show me New York");
expect(response.geojson).toBeTruthy();
expect(response.map_commands).toBeTruthy();
expect(response.metadata?.confidence).toBeGreaterThan(0);
```

## Performance

- **Average processing time**: 1-3 seconds
- **With MCP queries**: 2-5 seconds
- **With feedback loops**: 3-8 seconds (max 3 iterations)

## Troubleshooting

### Issue: Commands not executing
- Check console for validation errors
- Verify command parameters are within valid ranges
- Ensure map is loaded before sending commands

### Issue: Feedback loop not working
- Verify `feedbackCallback` is set in MapData
- Check that mapbox-map component is updated
- Look for feedback messages in console

### Issue: MCP queries failing
- Verify environment variables are set
- Check MCP client connection status
- Review MCP server logs

### Issue: Low confidence scores
- Text may not contain clear geographic data
- Try providing explicit coordinates
- Check if geocoding is needed

## Future Enhancements

- [ ] Support for more geometry types (MultiPolygon, GeometryCollection)
- [ ] Advanced route optimization
- [ ] Caching of MCP queries
- [ ] Parallel worker execution
- [ ] Custom worker plugins
- [ ] Real-time collaboration features
- [ ] Map state persistence
- [ ] Undo/redo for map operations

## References

- [AI SDK Workflow Patterns](https://ai-sdk.dev/docs/agents/workflows)
- [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/)
- [GeoJSON Specification](https://geojson.org/)
- [Zod Documentation](https://zod.dev/)

## License

Apache-2.0 (same as QCX project)
