import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
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

export function getModel() {
  const xaiApiKey = process.env.XAI_API_KEY
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const awsRegion = process.env.AWS_REGION
  const bedrockModelId = ''
  let modelBehavior = process.env.MODEL_BEHAVIOR || 'conservative'
  if (modelBehavior !== 'aggressive' && modelBehavior !== 'conservative') {
    modelBehavior = 'conservative'
  }

  if (xaiApiKey) {
    const xai = createXai({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    })
    try {
      const model = xai('grok-4-fast-non-reasoning')
      return { model, behavior: modelBehavior }
    } catch (error) {
      console.warn('xAI API unavailable, falling back to OpenAI:')
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
    })
    const model = bedrock(bedrockModelId, {
      additionalModelRequestFields: { top_k: 350 },
    })
    return { model, behavior: modelBehavior }
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const model = openai('gpt-4o')
  return { model, behavior: modelBehavior }
}
