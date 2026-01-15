# Debugging Map Integration

## Issue
The map is not being toggled/controlled by the agents - no locations rendering, no flyTo commands executing, and no follow-ups being generated.

## Changes Made

### 1. Updated to Simplified Enricher (v2)
**File**: `lib/agents/geojson-enricher-v2.tsx`

- Replaced complex orchestrator with simplified, reliable LLM-based extraction
- Added comprehensive logging at each step
- Improved prompt with clear examples for map commands
- Better error handling with fallback responses

### 2. Enhanced Location Response Handler
**File**: `components/map/location-response-handler.tsx`

- Added detailed console logging to track data flow
- Logs show:
  - Whether GeoJSON is present
  - Feature count
  - Whether commands are present
  - Command types
  - Full response structure

### 3. Updated Actions Integration
**File**: `app/actions.tsx`

- Changed import from `geojsonEnricher` to `geojsonEnricherV2`
- Updated function call to use new enricher

## Debugging Steps

### Step 1: Check Console Logs

When you ask a location-based question (e.g., "Show me Paris"), you should see these logs in the browser console:

```
🚀 Starting enhanced GeoJSON enrichment...
📝 Input text: [first 200 chars of researcher response]
📄 Raw LLM response: [first 500 chars of LLM output]
✂️ Stripped markdown fences (if present)
✅ Enhanced GeoJSON enrichment complete: {
  hasGeoJSON: true/false,
  featureCount: X,
  hasCommands: true/false,
  commandCount: X,
  commands: ['flyTo', 'setZoom', ...]
}
```

Then in LocationResponseHandler:

```
📍 LocationResponseHandler: Received data {
  hasGeoJSON: true/false,
  featureCount: X,
  hasCommands: true/false,
  commandCount: X,
  commands: [...],
  fullResponse: {...}
}
📍 LocationResponseHandler: Setting map data...
📍 LocationResponseHandler: New map data: {...}
```

### Step 2: Check Network Tab

Look for:
- API calls to `/api/chat` 
- Check the response includes `geojsonEnrichment` tool call
- Verify the tool response has valid GeoJSON and map_commands

### Step 3: Check React DevTools

1. Find the `MapDataContext` provider
2. Check the state values:
   - `geojson` should be populated
   - `mapCommands` should be an array
3. Find the `MapboxMap` component
4. Check if it's receiving the `mapCommands` prop

### Step 4: Check Map Command Execution

In the mapbox-map component, look for these logs:

```
🗺️ Executing X map commands...
🗺️ Executing command: flyTo with params: {...}
📍 Map feedback: {...}
```

## Common Issues and Solutions

### Issue 1: No GeoJSON or Commands Generated

**Symptoms**: Logs show `hasGeoJSON: false` and `hasCommands: false`

**Causes**:
- LLM didn't extract location information
- Input text doesn't contain clear location references
- JSON parsing failed

**Solutions**:
1. Check the raw LLM response in logs
2. Verify the input text contains location names or coordinates
3. Check for JSON parsing errors in console

### Issue 2: GeoJSON Generated but Not Rendering

**Symptoms**: Logs show GeoJSON present but map doesn't show features

**Causes**:
- MapDataContext not propagating state
- GeoJsonLayer component not mounted
- Invalid GeoJSON format

**Solutions**:
1. Check React DevTools for MapDataContext state
2. Verify GeoJsonLayer is rendered in the component tree
3. Validate GeoJSON structure matches schema

### Issue 3: Commands Generated but Not Executing

**Symptoms**: Logs show commands present but map doesn't move

**Causes**:
- Map instance not initialized
- useEffect not triggering
- Invalid command parameters

**Causes**:
1. Check if map is loaded: look for "Map loaded" log
2. Verify useEffect dependencies in mapbox-map.tsx
3. Check command params match expected format

### Issue 4: Follow-ups Not Generated

**Symptoms**: No follow-up questions appear

**Causes**:
- querySuggestor not being called
- Error in querySuggestor execution
- UI not rendering FollowupPanel

**Solutions**:
1. Check if querySuggestor is called in actions.tsx
2. Look for errors in console related to querySuggestor
3. Verify FollowupPanel component is mounted

## Testing Commands

### Test 1: Simple Location Query
```
User: "Show me Paris"
Expected:
- GeoJSON with Point feature at [2.3522, 48.8566]
- flyTo command with center: [2.3522, 48.8566], zoom: 12-15
```

### Test 2: Multiple Locations
```
User: "Show me Paris, London, and Berlin"
Expected:
- GeoJSON with 3 Point features
- fitBounds command to show all locations
```

### Test 3: Route Query
```
User: "Show me the route from New York to Boston"
Expected:
- GeoJSON with LineString feature
- fitBounds command to show the entire route
```

## Architecture Overview

```
User Query
    ↓
researcher agent (generates text response)
    ↓
geojsonEnricherV2 (extracts GeoJSON + commands)
    ↓
LocationResponse { text, geojson, map_commands }
    ↓
actions.tsx (stores in AI state as tool result)
    ↓
LocationResponseHandler (updates MapDataContext)
    ↓
MapDataContext (provides state to map components)
    ↓
MapboxMap (executes commands + renders GeoJSON)
```

## Key Files to Monitor

1. **lib/agents/geojson-enricher-v2.tsx** - Extraction logic
2. **components/map/location-response-handler.tsx** - State update
3. **components/map/map-data-context.tsx** - State management
4. **components/map/mapbox-map.tsx** - Command execution
5. **app/actions.tsx** - Integration point

## Next Steps if Still Not Working

1. **Add breakpoints** in:
   - `geojsonEnricherV2` after JSON parsing
   - `LocationResponseHandler` useEffect
   - `mapbox-map.tsx` command execution useEffect

2. **Check environment**:
   - Verify AI model is responding correctly
   - Check if there are rate limits or API errors
   - Ensure MapBox token is valid

3. **Simplify test case**:
   - Try hardcoding a LocationResponse in actions.tsx
   - Bypass the enricher to test if map commands work
   - Test with minimal GeoJSON structure

4. **Enable verbose logging**:
   - Set `console.log` at every step
   - Log the full state objects
   - Track React re-renders

## Contact

If issues persist after following this guide, provide:
- Full console logs from browser
- Network tab screenshot showing API responses
- React DevTools screenshot of MapDataContext state
- The exact query that was tested
