// lib/agents/router-agent.ts
import { CoreMessage, generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import {
  analyzeSatelliteImageSchema,
  executeAnalyzeSatelliteImage,
  generateEmbeddingsSchema,
  executeGenerateEmbeddings,
} from './tools/satellite-tools';
import { z } from 'zod';

// Schema to guide the router's decision. The model will populate this object.
const routerSchema = z.union([
  z.object({
    tool: z.literal('analyzeSatelliteImage'),
    args: analyzeSatelliteImageSchema,
  }),
  z.object({
    tool: z.literal('generateEmbeddings'),
    args: generateEmbeddingsSchema,
  }),
]);

/**
 * The router agent is responsible for selecting the appropriate sub-agent tool
 * to handle the user's request. It uses the Vercel AI SDK's `generateObject`
 * function to make a decision, then executes the corresponding tool.
 *
 * @param messages The conversation history.
 * @returns A promise that resolves to the result of the executed tool.
 */
export async function routerAgent(messages: CoreMessage[]) {
  console.log('Router agent is selecting a tool...');

  const parallelEnabled = process.env.PARALLEL_SUB_AGENTS === 'true';

  if (parallelEnabled) {
    console.log('Parallel sub-agents enabled. Executing all tools...');
    // In parallel mode, we execute all available tools to extract intelligence from all endpoints.
    // We use a default set of arguments for tools that require them, or we could potentially
    // use another LLM call to generate arguments for all tools.
    // For now, we'll execute them with default/mock arguments as a demonstration.
    const results = await Promise.all([
      executeAnalyzeSatelliteImage(),
      executeGenerateEmbeddings({ lat: 0, lon: 0, year: 2024 }) // Default args
    ]);

    // Merge results - this is a simplified merge logic
    const analysisResult = results[0] as any;
    return {
      analysis: `Parallel Analysis: ${analysisResult.analysis || 'N/A'}`,
      confidenceScore: analysisResult.confidenceScore || 0,
      detectedObjects: analysisResult.detectedObjects || [],
      embeddings: results[1]
    };
  }

  // 1. Use `generateObject` to get the model's choice of tool and arguments.
  const { object: toolChoice } = await generateObject({
    model: await getModel(true), // Assuming image analysis requires a powerful model
    messages,
    schema: routerSchema,
    prompt: 'Given the user request and the image, which tool is most appropriate? If an image is present, use analyzeSatelliteImage.',
  });

  // 2. Execute the chosen tool based on the object returned by the model.
  switch (toolChoice.tool) {
    case 'analyzeSatelliteImage': {
      const result = await executeAnalyzeSatelliteImage();
      console.log('Router agent executed analyzeSatelliteImage:', result);
      return result;
    }

    case 'generateEmbeddings': {
      const result = await executeGenerateEmbeddings(toolChoice.args);
      console.log('Router agent executed generateEmbeddings:', result);
      return result;
    }

    default: {
      // This should not be reached if the model adheres to the schema.
      throw new Error(`Unknown tool selected by the router.`);
    }
  }
}
