import { createStreamableValue } from 'ai/rsc'
import { locationEmbeddingsQuerySchema } from '@/lib/schema/location-embeddings'
import { ToolProps } from '.'
import { LocationEmbeddingsSection } from '@/components/location-embeddings-section'
import { createDeadlineSignal } from '@/lib/utils/with-timeout'

const DEFAULT_TENANT_ID = 'ten_01a0cd9a20c671b59c2cf55ee847bc66'
const DEFAULT_COLLECTION_ID = 'col_01a0cd9a20e170daac4573a3f7200000'

export const locationEmbeddingsTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description:
    'Search geospatial satellite/aerial vector embeddings using natural language text queries or coordinates, geocodes place names via Mapbox, and retrieves satellite thumbnail preview URLs',
  parameters: locationEmbeddingsQuerySchema,
  execute: async ({
    query,
    location,
    latitude,
    longitude,
    top_k = 10,
    tenantId,
    collectionId,
    apiKey
  }: {
    query?: string
    location?: string
    latitude?: number
    longitude?: number
    top_k?: number
    tenantId?: string
    collectionId?: string
    apiKey?: string
  }) => {
    const streamResults = createStreamableValue<string>()
    uiStream.append(<LocationEmbeddingsSection result={streamResults.value} />)

    let resolvedLatitude = latitude
    let resolvedLongitude = longitude
    let resolvedGeometry: any = null

    // If a place location is provided, geocode via Mapbox to extract coordinates/geometry
    if (location && (resolvedLatitude === undefined || resolvedLongitude === undefined || query)) {
      const mapboxToken =
        process.env.MAPBOX_ACCESS_TOKEN ||
        process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
        ''

      if (mapboxToken) {
        try {
          const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            location
          )}.json?access_token=${mapboxToken}&limit=1`
          const mapboxRes = await fetch(mapboxUrl, {
            method: 'GET',
            signal: createDeadlineSignal(10_000)
          })

          if (mapboxRes.ok) {
            const mapboxData = await mapboxRes.json()
            const feature = mapboxData?.features?.[0]
            if (feature) {
              if (
                Array.isArray(feature.center) &&
                feature.center.length >= 2 &&
                resolvedLatitude === undefined &&
                resolvedLongitude === undefined
              ) {
                resolvedLongitude = feature.center[0]
                resolvedLatitude = feature.center[1]
              }

              if (feature.geometry && feature.geometry.type !== 'Point') {
                resolvedGeometry = feature.geometry
              } else if (Array.isArray(feature.bbox) && feature.bbox.length === 4) {
                const [minX, minY, maxX, maxY] = feature.bbox
                resolvedGeometry = {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [minX, minY],
                      [maxX, minY],
                      [maxX, maxY],
                      [minX, maxY],
                      [minX, minY]
                    ]
                  ]
                }
              }
            }
          }
        } catch (mapboxErr) {
          console.error('Mapbox geocoding error in locationEmbeddingsTool:', mapboxErr)
        }
      }
    }

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

    // Determine endpoint: use search-by-text if natural language query is provided, else search-by-location
    const isTextSearch = Boolean(query && query.trim().length > 0)

    if (
      !isTextSearch &&
      (resolvedLatitude === undefined || resolvedLongitude === undefined)
    ) {
      const errorPayload = {
        error: 'Location search requires valid latitude and longitude coordinates.'
      }
      streamResults.done(JSON.stringify(errorPayload))
      return errorPayload
    }

    const searchEndpoint = isTextSearch
      ? `https://embeddings.api.lgnd.ai/v1/tenants/${effectiveTenantId}/collections/${effectiveCollectionId}/search-by-text`
      : `https://embeddings.api.lgnd.ai/v1/tenants/${effectiveTenantId}/collections/${effectiveCollectionId}/search-by-location`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (effectiveApiKey) {
      headers['Authorization'] = effectiveApiKey.startsWith('Bearer ')
        ? effectiveApiKey
        : `Bearer ${effectiveApiKey}`
    }

    const requestBody: Record<string, any> = { top_k }

    if (isTextSearch) {
      requestBody.query = query
      if (resolvedGeometry) {
        requestBody.geometry = resolvedGeometry
      }
    } else {
      requestBody.latitude = resolvedLatitude
      requestBody.longitude = resolvedLongitude
    }

    let apiResponse: any = null
    let errorMsg: string | null = null

    try {
      const res = await fetch(searchEndpoint, {
        method: 'POST',
        headers,
        signal: createDeadlineSignal(15_000),
        body: JSON.stringify(requestBody)
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')

        // If HTTP 422 or validation error occurs on a text search query due to geometry/location bounds,
        // retry the query without spatial/geometry constraints so semantic search still succeeds.
        const isGeometryBoundsError =
          res.status === 422 ||
          errorText.includes('intersect collection bounds') ||
          errorText.includes('VALIDATION_ERROR')

        if (isTextSearch && isGeometryBoundsError && requestBody.geometry) {
          console.warn(
            'Embeddings API geometry bounds error. Retrying search-by-text without spatial geometry constraint.'
          )
          const fallbackBody: Record<string, any> = { query, top_k }
          const fallbackRes = await fetch(searchEndpoint, {
            method: 'POST',
            headers,
            signal: createDeadlineSignal(15_000),
            body: JSON.stringify(fallbackBody)
          })

          if (fallbackRes.ok) {
            apiResponse = await fallbackRes.json()
          } else {
            const fallbackErrText = await fallbackRes.text().catch(() => '')
            errorMsg = `The requested location is outside the selected LGND collection bounds (${effectiveCollectionId}). Retry returned HTTP ${fallbackRes.status}: ${fallbackErrText || fallbackRes.statusText}`
          }
        } else if (isGeometryBoundsError) {
          errorMsg = `The requested location is outside the selected LGND collection bounds (${effectiveCollectionId}). Choose a collection covering this area or update LGND_COLLECTION_ID.`
        } else {
          errorMsg = `Embeddings API returned HTTP ${res.status}: ${errorText || res.statusText}`
        }
      } else {
        apiResponse = await res.json()
      }
    } catch (err: any) {
      console.error('Location Embeddings API error:', err)
      errorMsg = `Location Embeddings API error: ${err.message || String(err)}`
    }

    if (errorMsg) {
      const errorPayload = {
        query,
        location,
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
        top_k,
        error: errorMsg
      }
      streamResults.done(JSON.stringify(errorPayload))
      return errorPayload
    }

    // Extract items list
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

    // Fetch thumbnail URLs for each returned chip_id
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
      query,
      location,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
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
