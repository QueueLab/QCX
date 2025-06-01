// File: lib/actions/settings.ts
'use server';

import { Redis } from '@upstash/redis';
import { revalidatePath } from 'next/cache';

// Initialize Redis client (ensure environment variables are set for production)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant.";

/**
 * Saves the system prompt for a given user.
 * @param userId - The ID of the user.
 * @param systemPrompt - The system prompt text to save.
 * @returns An object indicating success or error.
 */
export async function saveSystemPrompt(
  userId: string,
  systemPrompt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) {
    return { error: 'User ID is required.' };
  }
  if (systemPrompt === null || systemPrompt === undefined) {
    return { error: 'System prompt cannot be null or undefined.' };
  }

  try {
    // Store the system prompt in a Redis hash, e.g., user:USER_ID:settings
    // Or a simple key like system_prompt:USER_ID
    await redis.set(`system_prompt:${userId}`, systemPrompt);

    // Revalidate the path where settings are displayed or used, if necessary
    // For example, if the settings page shows the current prompt:
    revalidatePath('/settings'); // Adjust path as needed

    return { success: true };
  } catch (error) {
    console.error('Error saving system prompt to Redis:', error);
    return { error: 'Failed to save system prompt.' };
  }
}

/**
 * Retrieves the system prompt for a given user.
 * If no prompt is found for the user, returns a default system prompt.
 * @param userId - The ID of the user.
 * @returns The user's system prompt or a default prompt.
 */
export async function getSystemPrompt(userId: string): Promise<string> {
  if (!userId) {
    // Return default prompt if no user ID is provided, or handle as an error
    return DEFAULT_SYSTEM_PROMPT;
  }

  try {
    const systemPrompt = await redis.get<string>(`system_prompt:${userId}`);
    return systemPrompt === null ? DEFAULT_SYSTEM_PROMPT : systemPrompt;
  } catch (error) {
    console.error('Error retrieving system prompt from Redis:', error);
    // Fallback to default prompt in case of error
    return DEFAULT_SYSTEM_PROMPT;
  }
}

/**
 * Saves all relevant settings for a user.
 * For now, it handles systemPrompt and selectedModel.
 * @param userId - The ID of the user.
 * @param settings - An object containing settings data.
 * @returns An object indicating success or error.
 */
export async function saveSettings(
  userId: string,
  settings: { systemPrompt?: string; selectedModel?: string }
): Promise<{ success?: boolean; error?: string; details?: any[] }> {
  if (!userId) {
    return { error: 'User ID is required.' };
  }

  const pipeline = redis.pipeline();
  let changesMade = false;
  const results = [];

  if (settings.systemPrompt !== undefined) {
    pipeline.set(`system_prompt:${userId}`, settings.systemPrompt);
    changesMade = true;
    results.push({ setting: 'systemPrompt', status: 'queued' });
  }

  if (settings.selectedModel !== undefined) {
    pipeline.set(`selected_model:${userId}`, settings.selectedModel);
    changesMade = true;
    results.push({ setting: 'selectedModel', status: 'queued' });
  }

  if (!changesMade) {
    return { success: true, error: 'No settings provided to save.' }; // Changed to success: true as no operation failed
  }

  try {
    const execResults = await pipeline.exec();

    // Check individual results from pipeline if needed
    // For set commands, Upstash Redis typically returns "OK" or the value set.
    // Example: results from pipeline.exec() for two set commands: ["OK", "OK"]
    execResults.forEach((res, index) => {
      if (results[index]) {
        results[index].status = res === "OK" || typeof res === 'string' ? 'saved' : 'error'; // Simplified check
        results[index].response = res;
      }
    });

    revalidatePath('/settings'); // Or relevant pages
    return { success: true, details: results };
  } catch (error) {
    console.error('Error saving settings to Redis:', error);
    return { error: 'Failed to save settings.' };
  }
}

/**
 * Retrieves all relevant settings for a given user.
 * @param userId - The ID of the user.
 * @returns An object containing the user's settings or default values.
 */
export async function getSettings(
  userId: string
): Promise<{ systemPrompt: string; selectedModel: string | null }> {
  if (!userId) {
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      selectedModel: null, // Or a default model
    };
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.get<string>(`system_prompt:${userId}`);
    pipeline.get<string>(`selected_model:${userId}`);

    const results = await pipeline.exec<[string | null, string | null]>();

    const systemPrompt = results[0] === null ? DEFAULT_SYSTEM_PROMPT : results[0];
    const selectedModel = results[1]; // Can be null if not set

    return { systemPrompt, selectedModel };
  } catch (error) {
    console.error('Error retrieving settings from Redis:', error);
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      selectedModel: null, // Fallback in case of error
    };
  }
}
