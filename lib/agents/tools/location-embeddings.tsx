import { createStreamableValue } from 'ai/rsc'
import { locationEmbeddingsQuerySchema } from '@/lib/schema/location-embeddings'
import { ToolProps } from '.'
import { LocationEmbeddingsSection } from '@/components/location-embeddings-section'
import { createDeadlineSignal } from '@/lib/utils/with-timeout'
import { Card } from '@/components/ui/card'

const DEFAULT_TENANT_ID = 'ten_01a0cd9a20c671b59c2cf55ee847bc66'
const DEFAULT_COLLECTION_ID = 'col_01a0cd9a20e170daac4573a3f7200000'

export const locationEmbeddingsTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description:
    'Search geospatial embeddings by location (latitude and longitude coordinates) using the LGND location embeddings search API',
  parameters: locationEmbeddingsQuerySchema,
  execute: async ({
    latitude,
    longitude,
    top_k = 10,
    tenantId,
    collectionId,
    apiKey
  }: {
    latitude: number
    longitude: number
    top_k?: number
    tenantId?: string
    collectionId?: string
    apiKey?: string
  }) => {
    const streamResults = createStreamableValue<string>()
    uiStream.append(<LocationEmbeddingsSection result={streamResults.value} />)

    const effectiveTenantId =
      tenantId || process.env.LGND_TENANT_ID || DEFAULT_TENANT_ID
    const effectiveCollectionId =
      collectionId || process.env.LGND_COLLECTION_ID || DEFAULT_COLLECTION_ID
    const effectiveApiKey =
      apiKey ||
      process.env.LGND_EMBEDDINGS_API_KEY ||
      process.env.EMBEDDINGS_API_KEY ||
      process.env.LGND_API_KEY ||
      ''

    const url = `https://embeddings.api.lgnd.ai/v1/tenants/${effectiveTenantId}/collections/${effectiveCollectionId}/search-by-location`

    let apiResponse: any = null
    let errorMsg: string | null = null

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (effectiveApiKey) {
        headers['Authorization'] = effectiveApiKey.startsWith('Bearer ')
          ? effectiveApiKey
          : `Bearer ${effectiveApiKey}`
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        signal: createDeadlineSignal(15_000),
        body: JSON.stringify({
          latitude,
          longitude,
          top_k
        })
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        errorMsg = `Embeddings API returned HTTP ${res.status}: ${errorText || res.statusText}`
      } else {
        apiResponse = await res.json()
      }
    } catch (err: any) {
      console.error('Location Embeddings API error:', err)
      errorMsg = `Location Embeddings API error: ${err.message || String(err)}`
    }

    if (errorMsg) {
      const errorPayload = {
        latitude,
        longitude,
        top_k,
        error: errorMsg
      }
      streamResults.done(JSON.stringify(errorPayload))
      return errorPayload
    }

    const formattedResult =
      apiResponse && typeof apiResponse === 'object'
        ? JSON.stringify(apiResponse, null, 2)
        : String(apiResponse)

    const payload = {
      latitude,
      longitude,
      top_k,
      tenantId: effectiveTenantId,
      collectionId: effectiveCollectionId,
      results: apiResponse,
      formattedResult: `\`\`\`json\n${formattedResult}\n\`\`\``
    }

    streamResults.done(JSON.stringify(payload))
    return payload
  }
})
