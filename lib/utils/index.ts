import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getSelectedModel } from '@/lib/actions/users'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai'
import { v4 as uuidv4 } from 'uuid'
import { LanguageModel } from 'ai'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return uuidv4()
}

export { generateUUID as nanoid }

/**
 * Toggle whether Azure should be the primary/default model
 * Set USE_AZURE=true in your .env file to enable
 */
const USE_AZURE = process.env.USE_AZURE === 'true' || process.env.USE_AZURE === '1'

export async function getModel(requireVision: boolean = false): Promise<LanguageModel> {
  const selectedModel = await getSelectedModel()

  // Environment variables
  const xaiApiKey = process.env.XAI_API_KEY
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const awsRegion = process.env.AWS_REGION
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0'
  const openaiApiKey = process.env.OPENAI_API_KEY
  const azureApiKey = process.env.AZURE_API_KEY
  const azureEndpoint = process.env.AZURE_ENDPOINT
  const azureDeploymentName = process.env.AZURE_DEPLOYMENT_NAME || 'gpt-5.5'

  // ====================== USER SELECTED MODEL ======================
  if (selectedModel) {
    switch (selectedModel) {
      case 'Grok 4.2':
        if (!xaiApiKey) throw new Error('Grok 4.2 selected but XAI_API_KEY not configured')
        return createXai({ apiKey: xaiApiKey, baseURL: 'https://api.x.ai/v1' })('grok-4-fast-non-reasoning')

      case 'Gemini 3':
      case 'Gemini 3.1 Pro':
        if (!gemini3ProApiKey) throw new Error('Gemini 3.1 Pro selected but GEMINI_3_PRO_API_KEY not configured')
        return createGoogleGenerativeAI({ apiKey: gemini3ProApiKey })('gemini-3.1-pro-preview')

      case 'GPT-5.1':
        if (!openaiApiKey) throw new Error('GPT-5.1 selected but OPENAI_API_KEY not configured')
        return createOpenAI({ apiKey: openaiApiKey })('gpt-4o')

      case 'Azure GPT 5.5':
        if (!azureEndpoint || !azureApiKey) {
          throw new Error('Azure GPT 5.5 selected but AZURE_ENDPOINT or AZURE_API_KEY not configured')
        }
        return createOpenAI({
          baseURL: azureEndpoint,
          apiKey: azureApiKey,
          compatibility: 'compatible',
        })(azureDeploymentName)

      default:
        console.warn(`Unknown selected model: ${selectedModel}, falling back to default`)
    }
  }

  // ====================== DEFAULT FALLBACK LOGIC ======================

  // Azure is primary when toggle is enabled
  if (USE_AZURE) {
    if (azureEndpoint && azureApiKey) {
      try {
        const azureOpenai = createOpenAI({
          baseURL: azureEndpoint,
          apiKey: azureApiKey,
          compatibility: 'compatible',
        })
        return azureOpenai(azureDeploymentName)
      } catch (error) {
        console.warn('Azure unavailable, falling back to other providers:', error)
      }
    } else {
      console.warn('USE_AZURE=true but Azure credentials not configured. Falling back...')
    }
  }

  // Fallback order when Azure is disabled or unavailable: Gemini → Grok → Bedrock → OpenAI
  if (gemini3ProApiKey) {
    try {
      return createGoogleGenerativeAI({ apiKey: gemini3ProApiKey })('gemini-3.1-pro-preview')
    } catch (error) {
      console.warn('Gemini unavailable:', error)
    }
  }

  if (xaiApiKey) {
    try {
      return createXai({ apiKey: xaiApiKey, baseURL: 'https://api.x.ai/v1' })('grok-4-fast-non-reasoning')
    } catch (error) {
      console.warn('xAI unavailable:', error)
    }
  }

  if (awsAccessKeyId && awsSecretAccessKey) {
    const bedrock = createAmazonBedrock({
      bedrockOptions: {
        region: awsRegion,
        credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey },
      },
    })
    return bedrock(bedrockModelId, { additionalModelRequestFields: { top_k: 350 } })
  }

  // Final fallback
  if (openaiApiKey) {
    return createOpenAI({ apiKey: openaiApiKey })('gpt-4o')
  }

  throw new Error(
    'No AI provider configured. Please set USE_AZURE=true with Azure credentials, or configure another provider.'
  )
}
