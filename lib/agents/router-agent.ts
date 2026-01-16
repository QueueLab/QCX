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

  // 1. Use `generateObject` to get the model's choice of tool and arguments.
  const { object: toolChoice } = await generateObject({
    model: await getModel(true), // Assuming image analysis requires a powerful model
    messages,
    schema: routerSchema,
    prompt: 'Given the user request and potentially an image, select the most appropriate tool. If the user is asking for satellite data or embeddings for a location shown in an image, you MUST choose the `generateEmbeddings` tool and you MUST extract the latitude, longitude, and a recent year (e.g., 2023) from the image context. For a general analysis of an image, choose `analyzeSatelliteImage`.',
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
