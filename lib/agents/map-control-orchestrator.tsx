import { generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import {
  QueryClassificationSchema,
  QueryClassification,
  LocationResponse,
  MapStateFeedback,
  GeoJSONFeatureCollection,
  MapCommand,
} from '@/lib/types/map-schemas';
import { geojsonParser } from './map-workers/geojson-parser';
import { mapCommandGenerator } from './map-workers/map-command-generator';
import { validateGeoJSON, validateMapCommands } from './map-workers/validator';
import { feedbackAnalyzer } from './map-workers/feedback-analyzer';

const ORCHESTRATOR_CLASSIFICATION_PROMPT = `You are a map operation orchestrator. Analyze the user's text and classify the type of map operation needed.

CLASSIFICATION TYPES:
1. simple_location: Single location to display (e.g., "Show me Paris")
2. route_distance: Route or distance between locations (e.g., "Distance from NYC to LA")
3. multi_location: Multiple locations to display (e.g., "Show Tokyo, London, and Paris")
4. nearby_search: Search for nearby places (e.g., "Find restaurants near me")
5. complex_operation: Multi-step or complex map operation

COMPLEXITY LEVELS:
- simple: Single straightforward operation
- moderate: Multiple steps or some complexity
- complex: Requires multiple tools, iterations, or advanced processing

MCP OPERATIONS:
- geocode: Convert address/place name to coordinates
- calculate_distance: Calculate distance/route between locations
- search_nearby: Find nearby points of interest
- generate_map_link: Generate map links

DETERMINE:
1. Operation type
2. Complexity level
3. Whether MCP queries are needed
4. Which MCP operations to use
5. Brief reasoning for classification`;

interface OrchestratorOptions {
  maxIterations?: number;
  enableFeedbackLoop?: boolean;
  mcpClient?: any; // MCP client instance
  connectionId?: string; // Composio connection ID
}

interface OrchestratorState {
  iteration: number;
  classification: QueryClassification | null;
  geojson: GeoJSONFeatureCollection | null;
  commands: MapCommand[];
  mcpData: any[];
  feedback: MapStateFeedback | null;
}

/**
 * Map Control Orchestrator Agent
 * Coordinates all map workers and manages the complete workflow
 */
export class MapControlOrchestrator {
  private options: Required<OrchestratorOptions>;
  private state: OrchestratorState;
  private model: any;

  constructor(options: OrchestratorOptions = {}) {
    this.options = {
      maxIterations: options.maxIterations || 3,
      enableFeedbackLoop: options.enableFeedbackLoop ?? true,
      mcpClient: options.mcpClient || null,
      connectionId: options.connectionId || '',
    };

    this.state = {
      iteration: 0,
      classification: null,
      geojson: null,
      commands: [],
      mcpData: [],
      feedback: null,
    };

    this.model = getModel();
  }

  /**
   * Main orchestration method
   */
  async process(
    researcherResponse: string,
    feedbackCallback?: (feedback: MapStateFeedback) => void
  ): Promise<LocationResponse> {
    const startTime = Date.now();
    this.state.iteration = 0;

    try {
      // Step 1: Classify the query
      console.log('🎯 Orchestrator: Classifying query...');
      this.state.classification = await this.classifyQuery(researcherResponse);
      console.log('📊 Classification:', this.state.classification);

      // Step 2: Query MCP if needed
      if (this.state.classification.requiresMCP && this.options.mcpClient) {
        console.log('🔌 Orchestrator: Querying MCP...');
        await this.queryMCP(researcherResponse);
      }

      // Step 3: Parse GeoJSON
      console.log('🗺️ Orchestrator: Parsing GeoJSON...');
      const parserOutput = await geojsonParser(researcherResponse);
      
      // If parser found locations needing geocoding and we have MCP, geocode them
      if (
        parserOutput.extractedLocations &&
        parserOutput.extractedLocations.length > 0 &&
        this.options.mcpClient
      ) {
        console.log('📍 Orchestrator: Geocoding extracted locations...');
        await this.geocodeLocations(parserOutput.extractedLocations);
      }

      this.state.geojson = parserOutput.geojson;

      // Validate GeoJSON
      if (this.state.geojson) {
        const validation = validateGeoJSON(this.state.geojson);
        if (!validation.valid) {
          console.warn('⚠️ GeoJSON validation errors:', validation.errors);
          // Try to fix or continue with warnings
        }
        if (validation.warnings) {
          console.warn('⚠️ GeoJSON validation warnings:', validation.warnings);
        }
      }

      // Step 4: Generate map commands
      console.log('🎮 Orchestrator: Generating map commands...');
      const commandOutput = await mapCommandGenerator({
        text: researcherResponse,
        geojson: this.state.geojson,
      });

      this.state.commands = commandOutput.commands;

      // Validate commands
      if (this.state.commands.length > 0) {
        const validation = validateMapCommands(this.state.commands);
        if (!validation.valid) {
          console.warn('⚠️ Command validation errors:', validation.errors);
          // Filter out invalid commands
          this.state.commands = this.state.commands.filter((_, idx) => {
            return !validation.errors.some(err => err.field.startsWith(`commands[${idx}]`));
          });
        }
        if (validation.warnings) {
          console.warn('⚠️ Command validation warnings:', validation.warnings);
        }
      }

      // Step 5: Return initial response
      const response: LocationResponse = {
        text: researcherResponse,
        geojson: this.state.geojson,
        map_commands: this.state.commands.length > 0 ? this.state.commands : null,
        metadata: {
          confidence: parserOutput.confidence,
          processingTime: Date.now() - startTime,
          mcpQueriesUsed: this.state.mcpData.map(d => d.tool),
          iterationCount: this.state.iteration,
        },
      };

      console.log('✅ Orchestrator: Initial processing complete');
      return response;

    } catch (error) {
      console.error('❌ Orchestrator error:', error);
      
      // Fallback response
      return {
        text: researcherResponse,
        geojson: null,
        map_commands: null,
        metadata: {
          confidence: 0,
          processingTime: Date.now() - startTime,
          mcpQueriesUsed: [],
          iterationCount: this.state.iteration,
        },
      };
    }
  }

  /**
   * Process feedback and refine if needed
   */
  async processFeedback(feedback: MapStateFeedback): Promise<LocationResponse | null> {
    if (!this.options.enableFeedbackLoop) {
      return null;
    }

    this.state.iteration++;
    this.state.feedback = feedback;

    console.log(`🔄 Orchestrator: Processing feedback (iteration ${this.state.iteration})...`);

    if (this.state.iteration >= this.options.maxIterations) {
      console.log('⚠️ Orchestrator: Max iterations reached, stopping feedback loop');
      return null;
    }

    try {
      // Analyze feedback
      const analysis = await feedbackAnalyzer({
        feedback,
        originalCommands: this.state.commands,
        attemptNumber: this.state.iteration,
      });

      console.log('📊 Feedback analysis:', analysis);

      // Act on recommendations
      switch (analysis.recommendations.action) {
        case 'continue':
          console.log('✅ Orchestrator: Feedback indicates success, continuing');
          return null;

        case 'abort':
          console.log('❌ Orchestrator: Aborting due to feedback analysis');
          return null;

        case 'retry':
          console.log('🔄 Orchestrator: Retrying with same commands');
          return {
            text: '',
            geojson: this.state.geojson,
            map_commands: this.state.commands,
            metadata: {
              iterationCount: this.state.iteration,
            },
          };

        case 'refine':
          console.log('🔧 Orchestrator: Refining commands based on feedback');
          if (analysis.recommendations.modifications) {
            this.state.commands = analysis.recommendations.modifications;
            
            // Validate refined commands
            const validation = validateMapCommands(this.state.commands);
            if (!validation.valid) {
              console.warn('⚠️ Refined command validation errors:', validation.errors);
            }

            return {
              text: '',
              geojson: this.state.geojson,
              map_commands: this.state.commands,
              metadata: {
                iterationCount: this.state.iteration,
              },
            };
          }
          return null;

        default:
          return null;
      }
    } catch (error) {
      console.error('❌ Feedback processing error:', error);
      return null;
    }
  }

  /**
   * Classify the query type
   */
  private async classifyQuery(text: string): Promise<QueryClassification> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: QueryClassificationSchema,
        prompt: `${ORCHESTRATOR_CLASSIFICATION_PROMPT}\n\nText to classify:\n${text}`,
        maxTokens: 512,
      });

      return object;
    } catch (error) {
      console.error('Classification error:', error);
      
      // Fallback classification
      return {
        type: 'simple_location',
        complexity: 'simple',
        requiresMCP: false,
        reasoning: 'Fallback classification due to error',
      };
    }
  }

  /**
   * Query MCP for additional data
   */
  private async queryMCP(text: string): Promise<void> {
    if (!this.options.mcpClient || !this.state.classification) {
      return;
    }

    const operations = this.state.classification.mcpOperations || [];

    for (const operation of operations) {
      try {
        let result;
        
        switch (operation) {
          case 'geocode':
            // Use Composio mapbox_geocode_location
             if (this.options.connectionId) {
                result = await this.options.mcpClient.executeAction({
                    action: 'mapbox_geocode_location',
                    params: {
                        query: text, // This might need better extraction of the specific location part
                        includeMapPreview: true
                    },
                    connectedAccountId: this.options.connectionId
                });
             }
            break;

          case 'calculate_distance':
             // Placeholder for matrix/directions
            break;

          case 'search_nearby':
            // Placeholder for search
             if (this.options.connectionId) {
                 result = await this.options.mcpClient.executeAction({
                     action: 'mapbox_search_box_text_search',
                     params: {
                         q: text
                     },
                     connectedAccountId: this.options.connectionId
                 });
             }
            break;

          case 'generate_map_link':
            // Would need coordinates
            // Skipping for now
            break;
        }

        if (result) {
          this.state.mcpData.push({
            tool: operation,
            result: result.data || result, // Adjust based on Composio response structure
          });
        }
      } catch (error) {
        console.error(`MCP ${operation} error:`, error);
      }
    }
  }

  /**
   * Geocode extracted locations using MCP
   */
  private async geocodeLocations(locations: string[]): Promise<void> {
    if (!this.options.mcpClient || !this.options.connectionId) {
      return;
    }

    const geocodedFeatures = [];

    for (const location of locations) {
      try {
        // Use Composio mapbox_geocode_location
        const result = await this.options.mcpClient.executeAction({
             action: 'mapbox_geocode_location',
             params: {
                 query: location,
                 includeMapPreview: false
             },
             connectedAccountId: this.options.connectionId
        });

        // Parse result and create GeoJSON feature
        // The Composio Mapbox Geocode tool returns structured data, usually.
        // We need to inspect the result structure. 
        // Based on typical Composio Mapbox tool response:
        const data = result.data || result;
        
        // Assuming data contains feature collection or similar.
        // If it returns the same format as the mock one from original code:
        if (data && data.features && data.features.length > 0) {
             const feature = data.features[0];
             geocodedFeatures.push({
                 type: 'Feature' as const,
                 geometry: feature.geometry,
                 properties: {
                     name: location,
                     place_name: feature.place_name || feature.properties?.place_name,
                     address: feature.properties?.address,
                     source: 'mcp_geocoding'
                 }
             });
        } else if (data && data.location) {
             // Handle custom simplified return if that's what it is
              geocodedFeatures.push({
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: [data.location.longitude, data.location.latitude] as [number, number],
                },
                properties: {
                  name: location,
                  place_name: data.location.place_name,
                  address: data.location.address,
                  source: 'mcp_geocoding',
                },
              });
        }
      } catch (error) {
        console.error(`Geocoding error for "${location}":`, error);
      }
    }

    // Merge geocoded features with existing GeoJSON
    if (geocodedFeatures.length > 0) {
      if (!this.state.geojson) {
        this.state.geojson = {
          type: 'FeatureCollection',
          features: geocodedFeatures,
        };
      } else {
        this.state.geojson.features.push(...geocodedFeatures);
      }
    }
  }
}

/**
 * Convenience function for simple usage
 */
export async function mapControlOrchestrator(
  researcherResponse: string,
  options?: OrchestratorOptions
): Promise<LocationResponse> {
  const orchestrator = new MapControlOrchestrator(options);
  return orchestrator.process(researcherResponse);
}
