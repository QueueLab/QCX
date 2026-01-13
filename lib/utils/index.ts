import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getSelectedModel } from '@/lib/actions/users'
import { openai } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return uuidv4();
}

export async function getModel(requireVision: boolean = false) {
  const selectedModel = await getSelectedModel();
  console.log(`[getModel] User-selected model: ${selectedModel}`);

  const xaiApiKey = process.env.XAI_API_KEY;
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const modelInitializers = {
    'QCX-Terra': () => {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        throw new Error('AWS credentials for QCX-Terra are not configured.');
      }
      const bedrock = createAmazonBedrock({
        bedrockOptions: {
          region: awsRegion,
          credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey },
        },
      });
      return bedrock(bedrockModelId, { additionalModelRequestFields: { top_k: 250 } });
    },
    'Grok 4.2': () => {
      if (!xaiApiKey) throw new Error('XAI_API_KEY for Grok 4.2 is not set.');
      const xai = createXai({ apiKey: xaiApiKey, baseURL: 'https://api.x.ai/v1' });
      return xai('grok-4-fast-non-reasoning');
    },
    'Gemini 3': () => {
      if (!gemini3ProApiKey) throw new Error('GEMINI_3_PRO_API_KEY for Gemini 3 is not set.');
      const google = createGoogleGenerativeAI({ apiKey: gemini3ProApiKey });
      return google('gemini-3-pro-preview');
    },
    'GPT-5.1': () => {
      if (!openaiApiKey) throw new Error('OPENAI_API_KEY for GPT-5.1 is not set.');
      const openai = createOpenAI({ apiKey: openaiApiKey });
      return openai('gpt-4o');
    },
  };

  if (selectedModel && selectedModel in modelInitializers) {
    try {
      console.log(`[getModel] Initializing user-selected model: ${selectedModel}`);
      return modelInitializers[selectedModel as keyof typeof modelInitializers]();
    } catch (error) {
      console.error(`[getModel] Failed to initialize selected model "${selectedModel}":`, error);
      // Fallback to default if the selected model fails for any reason.
    }
  }

  // Default fallback logic if no model is selected or initialization fails
  console.log('[getModel] No valid model selected, proceeding with default fallback chain.');
  const fallbackProviders = [
    { name: 'Grok', key: xaiApiKey, init: modelInitializers['Grok 4.2'] },
    { name: 'Gemini', key: gemini3ProApiKey, init: modelInitializers['Gemini 3'] },
    { name: 'Bedrock', key: awsAccessKeyId && awsSecretAccessKey, init: modelInitializers['QCX-Terra'] },
    { name: 'OpenAI', key: openaiApiKey, init: modelInitializers['GPT-5.1'] },
  ];

  for (const provider of fallbackProviders) {
    if (provider.key) {
      try {
        console.log(`[getModel] Attempting to use default provider: ${provider.name}`);
        return provider.init();
      } catch (error) {
        console.warn(`[getModel] ${provider.name} API unavailable, falling back to next provider:`, error);
      }
    }
  }

  throw new Error('No valid AI providers are configured. Please check your environment variables.');
}
