import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import {
  QueryClassification,
  QueryClassificationSchema,
  MCPResult,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  MapCommand,
  MapStateFeedback,
  LocationResponse
} from "@/lib/types/map-schemas";
import { geojsonParser } from "./map-workers/geojson-parser";
import { mapCommandGenerator } from "./map-workers/map-command-generator";
import { generateObject } from "ai";
import { getModel } from "../utils";

// Define the state schema
const MapGraphState = Annotation.Root({
  researcherResponse: Annotation<string>,
  classification: Annotation<QueryClassification | undefined>,
  mcpData: Annotation<MCPResult[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  geocodedFeatures: Annotation<GeoJSONFeature[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  geojson: Annotation<GeoJSONFeatureCollection | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  commands: Annotation<MapCommand[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  iteration: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
  feedback: Annotation<MapStateFeedback | undefined>,
  error: Annotation<string | undefined>,
  mcpClient: Annotation<any>,
  connectionId: Annotation<string | undefined>,
});

// Nodes
const classifierNode = async (state: typeof MapGraphState.State) => {
  console.log("--- NODE: CLASSIFIER ---");
  const model = await getModel();
  const ORCHESTRATOR_CLASSIFICATION_PROMPT = `Analyze the following response from a researcher agent and determine if it requires Mapbox MCP tool intervention.

  Classification Criteria:
  - simple_location: Researcher mentions one or two specific places.
  - route_distance: Researcher mentions travel between points or distances.
  - multi_location: Researcher lists many places (e.g., "top 10 museums").
  - nearby_search: Researcher mentions things "near" a location.
  - complex_operation: Requires multiple steps or logic.

  Response to analyze:
  ${state.researcherResponse}`;

  const { object } = await generateObject({
    model,
    schema: QueryClassificationSchema,
    prompt: ORCHESTRATOR_CLASSIFICATION_PROMPT,
  });

  return { classification: object };
};

const mcpExecutorNode = async (state: typeof MapGraphState.State) => {
  console.log("--- NODE: MCP_EXECUTOR ---");
  if (!state.classification || !state.mcpClient || !state.connectionId) {
    return { mcpData: [], geocodedFeatures: [] };
  }

  const operations = state.classification.mcpOperations || [];
  const mcpData: MCPResult[] = [];
  const geocodedFeatures: GeoJSONFeature[] = [];

  for (const operation of operations) {
    try {
      let result;
      switch (operation) {
        case 'geocode':
          result = await state.mcpClient.tools.execute('mapbox_geocode_location', {
            arguments: { query: state.researcherResponse, includeMapPreview: true },
            connectedAccountId: state.connectionId
          });
          break;
        case 'search_nearby':
          result = await state.mcpClient.tools.execute('mapbox_search_box_text_search', {
            arguments: { q: state.researcherResponse },
            connectedAccountId: state.connectionId
          });
          break;
      }

      if (result) {
        const data = (result as any).data || result;
        mcpData.push({ tool: operation, result: data, timestamp: Date.now() });

        if (data.features) {
          geocodedFeatures.push(...data.features);
        }
      }
    } catch (e) {
      console.error(`MCP error (${operation}):`, e);
    }
  }

  return { mcpData, geocodedFeatures };
};

const parserNode = async (state: typeof MapGraphState.State) => {
  console.log("--- NODE: PARSER ---");
  const parserOutput = await geojsonParser(state.researcherResponse);

  let finalGeojson = parserOutput.geojson;

  if (state.geocodedFeatures.length > 0) {
    if (!finalGeojson) {
      finalGeojson = { type: 'FeatureCollection', features: state.geocodedFeatures };
    } else {
      finalGeojson.features = [...finalGeojson.features, ...state.geocodedFeatures];
    }
  }

  return { geojson: finalGeojson };
};

const commandGeneratorNode = async (state: typeof MapGraphState.State) => {
  console.log("--- NODE: COMMAND_GENERATOR ---");
  if (!state.geojson) return { commands: [] };

  const { commands } = await mapCommandGenerator({
    text: state.researcherResponse,
    geojson: state.geojson
  });

  return { commands };
};

const validatorNode = async (state: typeof MapGraphState.State) => {
  console.log("--- NODE: VALIDATOR ---");
  return { iteration: 1 };
};

// Router for conditional edge
const shouldContinue = (state: typeof MapGraphState.State) => {
  const isSpatial = state.classification?.type !== undefined;
  const hasGeoJSON = state.geojson !== null && state.geojson.features.length > 0;

  if (isSpatial && !hasGeoJSON && (state.iteration || 0) < 2) {
    return "classifier";
  }
  return END;
};

// Define the graph
const workflow = new StateGraph(MapGraphState)
  .addNode("classifier", classifierNode)
  .addNode("mcp_executor", mcpExecutorNode)
  .addNode("parser", parserNode)
  .addNode("command_generator", commandGeneratorNode)
  .addNode("validator", validatorNode)
  .addEdge(START, "classifier")
  .addEdge("classifier", "mcp_executor")
  .addEdge("mcp_executor", "parser")
  .addEdge("parser", "command_generator")
  .addEdge("command_generator", "validator")
  .addConditionalEdges("validator", shouldContinue as any, {
    classifier: "classifier",
    [END]: END
  });

export const mapGraph = workflow.compile();

/**
 * Bridge to run the graph and return results
 */
export async function runMapGraph(
  researcherResponse: string,
  options: { mcpClient?: any, connectionId?: string, onStatusUpdate?: (status: string) => void }
): Promise<LocationResponse> {
  const initialState = {
    researcherResponse,
    iteration: 0,
    mcpData: [] as MCPResult[],
    geocodedFeatures: [] as GeoJSONFeature[],
    commands: [] as MapCommand[],
    geojson: null as GeoJSONFeatureCollection | null,
    mcpClient: options.mcpClient,
    connectionId: options.connectionId,
  };

  const stream = await mapGraph.stream(initialState, { streamMode: "values" });

  let finalResult: any = initialState;

  for await (const update of stream) {
    finalResult = update;

    if (options.onStatusUpdate) {
        if (update.classification && (!update.mcpData || update.mcpData.length === 0)) options.onStatusUpdate("Classifying query...");
        if (update.mcpData?.length > 0 && !update.geojson) options.onStatusUpdate("Geocoding locations...");
        if (update.geojson && (!update.commands || update.commands.length === 0)) options.onStatusUpdate("Generating map data...");
        if (update.commands?.length > 0) options.onStatusUpdate("Finalizing map...");
    }
  }

  return {
    text: researcherResponse,
    geojson: finalResult.geojson,
    map_commands: finalResult.commands && finalResult.commands.length > 0 ? finalResult.commands : null,
    metadata: {
      iterationCount: finalResult.iteration,
      mcpQueriesUsed: finalResult.mcpData?.map((d: any) => d.tool) || [],
    }
  };
}
