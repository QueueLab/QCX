import { createStreamableValue } from 'ai/rsc'
import { locationEmbeddingsQuerySchema } from '@/lib/schema/location-embeddings'
import { ToolProps } from '.'
import { LocationEmbeddingsSection } from '@/components/location-embeddings-section'
import { createDeadlineSignal } from '@/lib/utils/with-timeout'

const DEFAULT_TENANT_ID = 'ten_01a0cd9a20c671b59c2cf55ee847bc66'
const DEFAULT_COLLECTION_ID = 'col_01a0cd9a20e170daac4573a3f7200000'

export const locationEmbeddingsTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description:
    'Search geospatial satellite/aerial vector embeddings by location (latitude and longitude) using the LGND location embeddings search API and retrieve satellite thumbnail preview URLs',
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

    const searchUrl = `https://embeddings.api.lgnd.ai/v1/tenants/${effectiveTenantId}/collections/${effectiveCollectionId}/search-by-location`

    let apiResponse: any = null
    let errorMsg: string | null = null

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (effectiveApiKey) {
      headers['Authorization'] = effectiveApiKey.startsWith('Bearer ')
        ? effectiveApiKey
        : `Bearer ${effectiveApiKey}`
    }

    try {
      const res = await fetch(searchUrl, {
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

    // Extract items array from apiResponse
    let itemsList: any[] = []
    if (Array.isArray(apiResponse)) {
      itemsList = apiResponse
    } else if (apiResponse && typeof apiResponse === 'object') {
      if (Array.isArray(apiResponse.results)) {
        itemsList = apiResponse.results
      } else if (Array.isArray(apiResponse.items)) {
        itemsList = apiResponse.items
      } else if (Array.isArray(apiResponse.data)) {
        itemsList = apiResponse.data
      } else if (Array.isArray(apiResponse.chips)) {
        itemsList = apiResponse.chips
      }
    }

    // Fetch thumbnail URLs for every returned item with a chip_id
    const thumbnailImages: string[] = []
    if (itemsList.length > 0) {
      const thumbnailPromises = itemsList.map(async item => {
        const chipId = item.chip_id || item.chipId || item.id
        if (!chipId) return null

        try {
          const thumbUrl = `https://embeddings.api.lgnd.ai/v1/chips/${chipId}/thumbnail/url`
          const thumbHeaders: Record<string, string> = {}
          if (effectiveApiKey) {
            thumbHeaders['Authorization'] = effectiveApiKey.startsWith('Bearer ')
              ? effectiveApiKey
              : `Bearer ${effectiveApiKey}`
          }

          const thumbRes = await fetch(thumbUrl, {
            method: 'GET',
            headers: thumbHeaders,
            signal: createDeadlineSignal(10_000)
          })

          if (thumbRes.ok) {
            const thumbData = await thumbRes.json()
            const imgUrl =
              thumbData.url ||
              thumbData.thumbnailUrl ||
              thumbData.thumbnail_url ||
              thumbData.signed_url
            if (imgUrl) {
              item.thumbnail_url = imgUrl
              return imgUrl
            }
          }
        } catch (thumbErr) {
          console.error(`Failed to fetch thumbnail URL for chip_id ${chipId}:`, thumbErr)
        }
        return null
      })

      const fetchedThumbs = await Promise.allSettled(thumbnailPromises)
      fetchedThumbs.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          thumbnailImages.push(res.value)
        }
      })
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
      images: thumbnailImages,
      formattedResult: `\`\`\`json\n${formattedResult}\n\`\`\``
    }

    streamResults.done(JSON.stringify(payload))
    return payload
  }
})
