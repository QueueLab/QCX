# PR #312 Analysis: GeoJSON Enrichment Agent for Autonomous Map Control

## Current Implementation Overview

### Components

1. **geojson-enricher.tsx** - A single-agent approach that:
   - Takes researcher response text as input
   - Uses LLM to extract GeoJSON and map commands
   - Returns LocationResponse with text, geojson, and map_commands
   - Has basic error handling with fallback

2. **LocationResponse Interface**:
   ```typescript
   interface LocationResponse {
     text: string;
     geojson: GeoJSONFeatureCollection | null;
     map_commands?: MapCommand[] | null;
   }
   ```

3. **MapCommand Interface**:
   ```typescript
   interface MapCommand {
     command: 'flyTo' | 'easeTo' | 'fitBounds';
     params: any;
   }
   ```

4. **Integration Flow**:
   - User query → Researcher agent → geojsonEnricher → LocationResponseHandler → MapDataContext → Mapbox component

### Current Issues

1. **No Feedback Loop**: The agent generates map commands but has no way to:
   - Know if the map command was successful
   - Receive current map state from Mapbox
   - Adjust commands based on map feedback
   - Interact with Mapbox MCP for real-time data

2. **Single-Pass Processing**: 
   - One-shot enrichment with no iteration
   - No validation of generated GeoJSON
   - No quality checks on map commands
   - Missing Zod schema validation (noted in PR comments)

3. **Limited Autonomy**:
   - Cannot query Mapbox MCP for additional context
   - Cannot refine commands based on map state
   - No multi-step reasoning for complex map operations

4. **Weak Error Handling**:
   - Falls back to null on failure
   - No retry mechanism
   - No structured validation

## Multi-Agent Architecture Patterns (from AI SDK)

### 1. Sequential Processing (Chains)
- Steps executed in predefined order
- Each step's output → next step's input
- Good for: Well-defined sequences

### 2. Routing
- Model decides which path to take
- Intelligent routing based on context
- Good for: Varied inputs requiring different processing

### 3. Parallel Processing
- Independent tasks run simultaneously
- Good for: Multiple independent subtasks

### 4. Orchestrator-Worker
- Primary model coordinates specialized workers
- Each worker optimizes for specific subtask
- Good for: Complex tasks requiring different expertise

### 5. Evaluation/Feedback Loops
- Results checked and improved iteratively
- Good for: Quality control and refinement

## Recommended Architecture: Orchestrator-Worker with Feedback Loops

### Why This Pattern?

1. **Mapbox MCP Integration**: Orchestrator can query MCP for real-time map data
2. **Specialized Workers**:
   - GeoJSON Parser: Extract and validate geographic data
   - Map Command Generator: Create appropriate map commands
   - Validator: Check outputs with Zod schemas
3. **Feedback Loop**: Orchestrator receives map state and adjusts
4. **Autonomous Control**: Can make multi-step decisions

### Proposed Architecture

```
User Query
    ↓
Researcher Agent (existing)
    ↓
Map Control Orchestrator ←→ Mapbox MCP
    ├─→ GeoJSON Parser Worker
    ├─→ Map Command Generator Worker
    ├─→ Validator Worker
    └─→ Feedback Analyzer Worker
    ↓
LocationResponse
    ↓
LocationResponseHandler
    ↓
MapDataContext → Mapbox Component
         ↓
    [Feedback to Orchestrator]
```

### Key Features

1. **Orchestrator Agent**:
   - Coordinates all workers
   - Queries Mapbox MCP for current state
   - Makes routing decisions
   - Handles feedback loops
   - Manages multi-step operations

2. **Worker Agents**:
   - **GeoJSON Parser**: Extracts geographic data with Zod validation
   - **Map Command Generator**: Creates commands based on context
   - **Validator**: Ensures data quality
   - **Feedback Analyzer**: Processes map state feedback

3. **Feedback Integration**:
   - Map state reporting back to orchestrator
   - Ability to refine commands
   - Error recovery with retries
   - Adaptive behavior based on map response

4. **Mapbox MCP Integration**:
   - Query current map bounds
   - Get feature information
   - Validate coordinates
   - Access map metadata

## Implementation Plan

1. Create `map-control-orchestrator.tsx` - Main coordinator
2. Create worker agents in `lib/agents/map-workers/`:
   - `geojson-parser.tsx`
   - `map-command-generator.tsx`
   - `validator.tsx`
   - `feedback-analyzer.tsx`
3. Add Zod schemas for validation
4. Integrate Mapbox MCP client
5. Add feedback mechanism from Mapbox component
6. Update LocationResponseHandler to support feedback
7. Add state management for orchestrator context

## Next Steps

1. Design detailed orchestrator workflow
2. Implement Zod schemas for validation
3. Create worker agents
4. Build feedback mechanism
5. Test with Mapbox MCP integration
