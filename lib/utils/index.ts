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

function isValidHttpsUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
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
  const azureEndpoint = process.env.AZURE_ENDPOINT;
  const azureApiKey = process.env.AZURE_API_KEY;
  const azureDeploymentName = process.env.AZURE_DEPLOYMENT_NAME || 'gpt-5.5';

  if (selectedModel) {
    switch (selectedModel) {
      case 'Grok 4.2':
        if (xaiApiKey) {
          const xai = createXai({
            apiKey: xaiApiKey,
            baseURL: 'https://api.x.ai/v1',
          });
          return xai('grok-4-fast-non-reasoning');
        } else {
          console.error('User selected "Grok 4.2" but XAI_API_KEY is not set.');
          throw new Error('Selected model is not configured.');
        }

      case 'Gemini 3':
      case 'Gemini 3.1 Pro':
        if (gemini3ProApiKey) {
          const google = createGoogleGenerativeAI({
            apiKey: gemini3ProApiKey,
          });
          return google('gemini-3.1-pro-preview');
        } else {
          console.error('User selected "Gemini 3.1 Pro" but GEMINI_3_PRO_API_KEY is not set.');
          throw new Error('Selected model is not configured.');
        }

      case 'GPT-5.1':
        if (openaiApiKey) {
          const openai = createOpenAI({ apiKey: openaiApiKey });
          return openai('gpt-4o');
        } else {
          console.error('User selected "GPT-5.1" but OPENAI_API_KEY is not set.');
          throw new Error('Selected model is not configured.');
        }

      case 'GPT-5.5':
        if (azureApiKey && isValidHttpsUrl(azureEndpoint)) {
          const azure = createOpenAI({
            baseURL: azureEndpoint,
            apiKey: azureApiKey,
          });
          return azure(azureDeploymentName);
        } else {
          console.error('User selected "GPT-5.5" but AZURE_API_KEY or AZURE_ENDPOINT is not set or is not a valid HTTPS URL.');
          throw new Error('Selected model is not configured.');
        }

      default:
        console.warn(`Unknown selected model: ${selectedModel}, falling back to default.`);
    }
  }

  // === Default fallback order: Gemini → Grok → Bedrock → OpenAI → Azure ===
  // Azure is last in the automatic fallback to avoid accidental use of placeholder credentials.
  // It is still the primary provider when explicitly selected via the model picker.

  if (gemini3ProApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: gemini3ProApiKey,
    });
    return google('gemini-3.1-pro-preview');
  }

  if (xaiApiKey) {
    const xai = createXai({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    return xai('grok-4-fast-non-reasoning');
  }

  if (awsAccessKeyId && awsSecretAccessKey) {
    const bedrock = createAmazonBedrock({
      bedrockOptions: {
        region: awsRegion,
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      },
    });
    return bedrock(bedrockModelId, {
      additionalModelRequestFields: { top_k: 350 },
    });
  }

  if (azureApiKey && isValidHttpsUrl(azureEndpoint)) {
    const azure = createOpenAI({
      baseURL: azureEndpoint,
      apiKey: azureApiKey,
    });
    return azure(azureDeploymentName);
  }

  // Final fallback
  if (!openaiApiKey) {
    throw new Error('No model providers are configured. Please set at least one API key.');


  const openai = createOpenAI({ apiKey: openaiApiKey });
  return openai('gpt-4o');
}
