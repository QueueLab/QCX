import { handleCallback } from '@vercel/queue';
import { resolutionSearch } from '@/lib/agents/resolution-search';
import { CoreMessage } from 'ai';

export const POST = handleCallback(async (message: { messages: CoreMessage[], timezone: string, drawnFeatures?: any[], location?: { lat: number, lng: number } }, metadata) => {
  console.log(`Processing resolution search message ${metadata.messageId} for topic ${metadata.topicName}`);
  try {
    // Execute the resolutionSearch logic asynchronously
    const result = await resolutionSearch(message.messages, message.timezone, message.drawnFeatures, message.location);
    console.log(`Resolution search message ${metadata.messageId} processed successfully.`);
    // In a real application, you would likely store this result in a database
    // or notify the original requestor through a webhook or websocket.
    return { status: 'success', result };
  } catch (error) {
    console.error(`Error processing resolution search message ${metadata.messageId}:`, error);
    throw error; // Re-throw to trigger retry mechanism
  }
});
