// lib/services/mock-satellite-services.ts

/**
 * Represents the structured "satellite intelligence" data.
 */
export interface SatelliteIntelligence {
  analysis: string;
  confidenceScore: number;
  detectedObjects: string[];
}

/**
 * Represents the embeddings data.
 */
export interface Embeddings {
  vector: number[];
  model: string;
}

/**
 * Mock function to simulate the response from an Azure ONNX service.
 * In a real implementation, this function would make a REST API call
 * to the ONNX service endpoint.
 *
 * @returns A promise that resolves to a SatelliteIntelligence object.
 */
export async function getOnnxAnalysis(): Promise<SatelliteIntelligence> {
  console.log('Mocking ONNX analysis...');
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    analysis: 'The mock analysis indicates a high concentration of vehicles in the area.',
    confidenceScore: 0.85,
    detectedObjects: ['vehicles', 'buildings', 'roads'],
  };
}

/**
 * Mock function to simulate the response from a Google Cloud embedding service.
 * In a real implementation, this function would make a call to the
 * Google Cloud AI Platform to get embeddings for the given text.
 *
 * @param text The text to get embeddings for.
 * @returns A promise that resolves to an Embeddings object.
 */
export async function getEmbeddings(text: string): Promise<Embeddings> {
  console.log(`Mocking embeddings for text: "${text}"`);
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    vector: [0.1, 0.2, 0.3, 0.4, 0.5],
    model: 'mock-embedding-model-v1',
  };
}
