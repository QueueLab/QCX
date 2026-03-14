import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getSelectedModel } from '@/lib/actions/users'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return uuidv4();
}

/**
 * Re-export generateUUID as nanoid for shorter naming and compatibility with existing code.
 * Returns a UUID v4 string.
 */
export { generateUUID as nanoid };

function createGrokModel(apiKey: string) {
  const xai = createXai({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
  return xai('grok-4-fast-non-reasoning');
}

function createGeminiModel(apiKey: string) {
  const google = createGoogleGenerativeAI({
    apiKey,
  });
  return google('gemini-3-pro-preview');
}

function createBedrockModel(config: { accessKeyId: string; secretAccessKey: string; region?: string; modelId: string }) {
  const bedrock = createAmazonBedrock({
    bedrockOptions: {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    },
  });
  return bedrock(config.modelId, {
    additionalModelRequestFields: { top_k: 350 },
  });
}

function createOpenAIModel(apiKey?: string) {
  const openai = createOpenAI({
    apiKey,
  });
  return openai('gpt-4o');
}

export async function getModel(requireVision: boolean = false) {
  const selectedModel = await getSelectedModel();

  const xaiApiKey = process.env.XAI_API_KEY;
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const providers = [
    {
      id: 'Grok 4.2',
      check: () => !!xaiApiKey,
      create: () => createGrokModel(xaiApiKey!),
    },
    {
      id: 'Gemini 3',
      check: () => !!gemini3ProApiKey,
      create: () => createGeminiModel(gemini3ProApiKey!),
    },
    {
      id: 'Bedrock', // Used for fallback chain
      check: () => !!(awsAccessKeyId && awsSecretAccessKey),
      create: () => createBedrockModel({
        accessKeyId: awsAccessKeyId!,
        secretAccessKey: awsSecretAccessKey!,
        region: awsRegion,
        modelId: bedrockModelId
      }),
    },
    {
      id: 'GPT-5.1',
      check: () => !!openaiApiKey,
      create: () => createOpenAIModel(openaiApiKey),
    }
  ];

  if (selectedModel) {
    const provider = providers.find(p => p.id === selectedModel);
    if (provider) {
      if (provider.check()) {
        try {
          return provider.create();
        } catch (error) {
          console.error(`Selected model "${selectedModel}" is configured but failed to initialize.`, error);
          throw new Error('Failed to initialize selected model.');
        }
      } else {
        console.error(`User selected "${selectedModel}" but API key is not set.`);
        throw new Error('Selected model is not configured.');
      }
    }
  }

  // Default behavior: Grok -> Gemini -> Bedrock -> OpenAI
  // Iterate through providers (excluding OpenAI explicit check to fallback to default logic at end)
  // Actually, we can just iterate the first 3. OpenAI is handled at the end.
  // The 'GPT-5.1' entry in providers is for explicit selection matching.

  for (const provider of providers) {
    // Skip GPT-5.1 in the loop because we handle it as the final fallback
    // and the loop only tries enabled providers.
    // If OpenAI key is set, the loop would return it.
    // If NOT set, loop finishes, and final line returns it (which might fail or use default).
    // Original code falls back to OpenAI last.

    if (provider.id === 'GPT-5.1') continue;

    if (provider.check()) {
      try {
        return provider.create();
      } catch (error) {
        console.warn(`${provider.id} API unavailable, falling back to next provider:`, error);
      }
    }
  }

  return createOpenAIModel(openaiApiKey);
}
