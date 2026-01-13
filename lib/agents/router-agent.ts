// lib/agents/router-agent.ts
import { CoreMessage, streamObject } from 'ai';
import { getModel } from '@/lib/utils';
import { satelliteTools } from './tools/satellite-tools';
import { z } from 'zod';

/**
 * The router agent is responsible for selecting the appropriate sub-agent tool
 * to handle the user's request. It uses the Vercel AI SDK's `streamObject`
 * function to make a decision and execute the tool.
 *
 * @param messages The conversation history.
 * @returns A promise that resolves to the result of the executed tool.
 */
export async function routerAgent(messages: CoreMessage[]) {
  console.log('Router agent is selecting a tool...');

  // Use `streamObject` to decide which tool to use and execute it.
  const { toolResult } = await streamObject({
    model: await getModel(true), // Assuming image analysis requires a powerful model
    messages,
    tools: satelliteTools,
    // The schema is used to constrain the model's output to a valid tool call.
    schema: z.union([
      z.object({
        tool: z.literal('analyzeSatelliteImage'),
        args: z.object({}),
      }),
      z.object({
        tool: z.literal('generateEmbeddings'),
        args: z.object({
          text: z.string(),
        }),
      }),
    ]),
  });

  const result = await toolResult;
  console.log('Router agent has executed the tool:', result);

  return result;
}
