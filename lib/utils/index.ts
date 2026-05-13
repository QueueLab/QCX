import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getSelectedModel } from '@/lib/actions/users'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai';
import { createAzure } from '@ai-sdk/azure';
import { v4 as uuidv4 } from 'uuid';
import { LanguageModel } from 'ai'

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

export async function getModel(requireVision: boolean = false): Promise<LanguageModel> {
  const selectedModel = await getSelectedModel();

  const xaiApiKey = process.env.XAI_API_KEY;
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const azureResourceName = process.env.AZURE_RESOURCE_NAME;
  const azureApiKey = process.env.AZURE_API_KEY;
  const azureEndpoint = process.env.AZURE_ENDPOINT;
  const azureDeploymentName = process.env.AZURE_DEPLOYMENT_NAME || 'gpt-5.5';

  if (selectedModel) {
    switch (selectedModel) {
      case 'Grok 4.2':
        if (xaiApiKey) {
          const xai = createXai({
            apiKey: xaiApiKey,
            baseURL: 'https://api.x.ai/v1',
          });
          try {
            return xai('grok-4-fast-non-reasoning');
          } catch (error) {
            console.error('Selected model "Grok 4.2" is configured but failed to initialize.', error);
            throw new Error('Failed to initialize selected model.');
          }
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
          try {
            return google('gemini-3.1-pro-preview');
          } catch (error) {
            console.error('Selected model "Gemini 3.1 Pro" is configured but failed to initialize.', error);
            throw new Error('Failed to initialize selected model.');
          }
        } else {
            console.error('User selected "Gemini 3.1 Pro" but GEMINI_3_PRO_API_KEY is not set.');
            throw new Error('Selected model is not configured.');
        }
      case 'GPT-5.1':
        if (openaiApiKey) {
          const openai = createOpenAI({
            apiKey: openaiApiKey,
          });
          return openai('gpt-4o');
        } else {
            console.error('User selected "GPT-5.1" but OPENAI_API_KEY is not set.');
            throw new Error('Selected model is not configured.');
        }
      case 'Azure GPT 5.5':
        if (azureEndpoint && azureApiKey) {
          const azureOpenAI = createOpenAI({
            baseURL: azureEndpoint,
            apiKey: azureApiKey,
          });
          try {
            return azureOpenAI(azureDeploymentName);
          } catch (error) {
            console.error('Selected model "Azure GPT 5.5" (via endpoint) failed to initialize.', error);
            throw new Error('Failed to initialize selected model.');
          }
        } else if (azureResourceName && azureApiKey) {
          const azure = createAzure({
            resourceName: azureResourceName,
            apiKey: azureApiKey,
          });
          try {
            return azure(azureDeploymentName) as unknown as LanguageModel;
          } catch (error) {
            console.error('Selected model "Azure GPT 5.5" (via resource) failed to initialize.', error);
            throw new Error('Failed to initialize selected model.');
          }
        } else {
          console.error('User selected "Azure GPT 5.5" but Azure environment variables are not set.');
          throw new Error('Selected model is not configured.');
        }
    }
  }

  // Default behavior: Azure -> Gemini -> Grok -> Bedrock -> OpenAI
  if (azureEndpoint && azureApiKey) {
    const azureOpenAI = createOpenAI({
      baseURL: azureEndpoint,
      apiKey: azureApiKey,
    });
    try {
      return azureOpenAI(azureDeploymentName);
    } catch (error) {
      console.warn('Azure OpenAI API (via endpoint) unavailable, falling back to next provider:', error);
    }
  }

  if (azureResourceName && azureApiKey) {
    const azure = createAzure({
      resourceName: azureResourceName,
      apiKey: azureApiKey,
    });
    try {
      return azure(azureDeploymentName) as unknown as LanguageModel;
    } catch (error) {
      console.warn('Azure OpenAI API (via resource) unavailable, falling back to next provider:', error);
    }
  }

  if (gemini3ProApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: gemini3ProApiKey,
    });
    try {
      return google('gemini-3.1-pro-preview');
    } catch (error) {
      console.warn('Gemini 3.1 Pro API unavailable, falling back to next provider:', error);
    }
  }

  if (xaiApiKey) {
    const xai = createXai({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    try {
      return xai('grok-4-fast-non-reasoning');
    } catch (error) {
      console.warn('xAI API unavailable, falling back to next provider:');
    }
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
    const model = bedrock(bedrockModelId, {
      additionalModelRequestFields: { top_k: 350 },
    });
    return model;
  }

  const openai = createOpenAI({
    apiKey: openaiApiKey,
  });
  return openai('gpt-4o');
}
