// lib/agents/router-agent.ts
import { CoreMessage, generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import { satelliteTools } from './tools/satellite-tools';
import { z } from 'zod';

// Schema to guide the router's decision. The model will populate this object.
const routerSchema = z.union([
  z.object({
    tool: z.literal('analyzeSatelliteImage'),
    // Pass an empty args object for consistency, even if not used by the tool.
    args: z.object({}).describe('The arguments for analyzing the satellite image.'),
  }),
  z.object({
    tool: z.literal('generateEmbeddings'),
    args: z.object({
      text: z.string(),
    }),
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
    prompt: 'Given the user request and the image, which tool is most appropriate? If an image is present, use analyzeSatelliteImage.',
  });

  // 2. Execute the chosen tool based on the object returned by the model.
  switch (toolChoice.tool) {
    case 'analyzeSatelliteImage': {
      const result = await satelliteTools.analyzeSatelliteImage.execute(
        toolChoice.args
      );
      console.log('Router agent executed analyzeSatelliteImage:', result);
      return result;
    }

    case 'generateEmbeddings': {
      const result = await satelliteTools.generateEmbeddings.execute(
        toolChoice.args
      );
      console.log('Router agent executed generateEmbeddings:', result);
      return result;
    }

    default: {
      // This should not be reached if the model adheres to the schema.
      throw new Error(`Unknown tool selected by the router.`);
    }
  }
}
