// lib/agents/tools/satellite-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { getOnnxAnalysis, getEmbeddings } from '@/lib/services/mock-satellite-services';

/**
 * Defines the tools for the satellite intelligence sub-agents.
 * These tools are used by the router agent to delegate tasks.
 */
export const satelliteTools = {
  /**
   * Tool to analyze a satellite image using the mock ONNX service.
   */
  analyzeSatelliteImage: tool({
    description: 'Analyzes a satellite image to extract intelligence.',
    parameters: z.object({
      // In a real implementation, you might pass image data or a URL here.
      // For the mock, no parameters are needed.
    }),
    execute: async () => {
      try {
        const result = await getOnnxAnalysis();
        return result;
      } catch (error) {
        console.error('Error in analyzeSatelliteImage tool:', error);
        return { error: 'Failed to analyze satellite image.' };
      }
    },
  }),

  /**
   * Tool to generate embeddings for a given text using the mock Google Cloud service.
   */
  generateEmbeddings: tool({
    description: 'Generates embeddings for a given text.',
    parameters: z.object({
      text: z.string().describe('The text to generate embeddings for.'),
    }),
    execute: async ({ text }) => {
      try {
        const result = await getEmbeddings(text);
        return result;
      } catch (error) {
        console.error('Error in generateEmbeddings tool:', error);
        return { error: 'Failed to generate embeddings.' };
      }
    },
  }),
};
