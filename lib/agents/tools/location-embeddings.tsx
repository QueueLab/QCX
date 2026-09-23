import { createStreamableValue } from 'ai/rsc'
import { locationEmbeddingsQuerySchema } from '@/lib/schema/location-embeddings'
import { ToolProps } from '.'
import { LocationEmbeddingsSection } from '@/components/location-embeddings-section'
import { createDeadlineSignal } from '@/lib/utils/with-timeout'

const DEFAULT_TENANT_ID = 'ten_01a0cd9a20c671b59c2cf55ee847bc66'
const DEFAULT_COLLECTION_ID = 'col_01a0cd9a20e170daac4573a3f7200000'
const EMBEDDINGS_API_BASE = 'https://embeddings.api.lgnd.ai/v1'

type SearchResult = {
  chip_id?: string
  score?: number
  distance?: number
  datetime?: string
  collection?: string
  centroid?: { coordinates?: number[] }
}

type Thumbnail = {
  url: string
  expires_at?: string
  chip_id: string
}

function authorizationHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  }
}

async function getThumbnail(
  chipId: string,
  headers: Record<string, string>
): Promise<Thumbnail | null> {
  const response = await fetch(
    `${EMBEDDINGS_API_BASE}/chips/${encodeURIComponent(chipId)}/thumbnail/url`,
    {
      method: 'GET',
      headers,
      signal: createDeadlineSignal(15_000)
    }
  )

  if (!response.ok) {
    console.warn(
      `Unable to fetch thumbnail URL for chip ${chipId}: HTTP ${response.status}`
    )
    return null
  }

  const payload = (await response.json()) as { url?: unknown; expires_at?: string }
  return typeof payload.url === 'string'
    ? { chip_id: chipId, url: payload.url, expires_at: payload.expires_at }
    : null
}

export const locationEmbeddingsTool = ({ uiStream }: ToolProps) => ({
  description:
    'Search satellite-image embeddings near a latitude and longitude using the LGND embeddings API. Use this for spatial similarity searches, not ordinary place lookup or directions.',
  parameters: locationEmbeddingsQuerySchema,
  execute: async ({
    latitude,
    longitude,
    top_k = 10,
    start_date,
    end_date,
    geometry
  }: {
    latitude: number
    longitude: number
    top_k?: number
    start_date?: string
    end_date?: string
    geometry?: unknown
  }) => {
    const streamResults = createStreamableValue<string>()
    uiStream.append(<LocationEmbeddingsSection result={streamResults.value} />)

    const tenantId = process.env.LGND_TENANT_ID || DEFAULT_TENANT_ID
    const collectionId = process.env.LGND_COLLECTION_ID || DEFAULT_COLLECTION_ID
    const apiKey =
      process.env.LGND_EMBEDDINGS_API_KEY ||
      process.env.EMBEDDINGS_API_KEY ||
      process.env.LGND_API_KEY ||
      ''

    if (!apiKey) {
      const payload = {
        latitude,
        longitude,
        top_k,
        error:
          'LGND embeddings credentials are not configured. Set LGND_EMBEDDINGS_API_KEY on the server.'
      }
      streamResults.done(JSON.stringify(payload))
      return payload
    }

    const url = `${EMBEDDINGS_API_BASE}/tenants/${encodeURIComponent(tenantId)}/collections/${encodeURIComponent(collectionId)}/search-by-location`
    const headers = authorizationHeaders(apiKey)
    let apiResponse: { data?: SearchResult[]; _meta?: unknown } | null = null

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: createDeadlineSignal(15_000),
        body: JSON.stringify({
          latitude,
          longitude,
          top_k,
          ...(start_date ? { start_date } : {}),
          ...(end_date ? { end_date } : {}),
          ...(geometry ? { geometry } : {})
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(
          `Embeddings API returned HTTP ${response.status}: ${errorText || response.statusText}`
        )
      }

      apiResponse = (await response.json()) as {
        data?: SearchResult[]
        _meta?: unknown
      }
    } catch (error: unknown) {
      console.error('Location Embeddings API error:', error)
      const message = error instanceof Error ? error.message : String(error)
      const payload = { latitude, longitude, top_k, error: message }
      streamResults.done(JSON.stringify(payload))
      return payload
    }

    const results = Array.isArray(apiResponse?.data) ? apiResponse.data : []
    const thumbnails = (
      await Promise.all(
        results
          .filter((result): result is SearchResult & { chip_id: string } =>
            typeof result.chip_id === 'string' && result.chip_id.length > 0
          )
          .map(result => getThumbnail(result.chip_id, headers).catch(() => null))
      )
    ).filter((thumbnail): thumbnail is Thumbnail => thumbnail !== null)

    const formattedResult = JSON.stringify(apiResponse, null, 2)
    const payload = {
      latitude,
      longitude,
      top_k,
      tenantId,
      collectionId,
      results: apiResponse,
      images: thumbnails,
      formattedResult: `\`\`\`json\n${formattedResult}\n\`\`\``
    }

    streamResults.done(JSON.stringify(payload))
    return payload
  }
})

export { getThumbnail }
