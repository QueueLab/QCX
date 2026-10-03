import { describe, expect, it } from 'bun:test'
import { buildPersistedAnalysisContext } from '../lib/utils/persisted-analysis-context'

describe('persisted analysis context', () => {
  it('reconstructs useful LGND and resolution-search facts without forwarding bulky image or raw geometry data', () => {
    const context = buildPersistedAnalysisContext([
      {
        role: 'assistant',
        type: 'resolution_search_result',
        content: JSON.stringify({
          summary: 'Visible clearing near the river; compare this against prior timber imagery.',
          extractedLatitude: 44.5,
          extractedLongitude: -121.25,
          cogApplicable: true,
          cogDescription: 'Use multispectral imagery for vegetation change.',
          geoJson: {
            type: 'FeatureCollection',
            features: [{
              geometry: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [1, 2]]] },
              properties: { name: 'Clearing', description: 'Possible recent disturbance' }
            }]
          },
          image: 'data:image/png;base64,VERY_LARGE_IMAGE_DATA',
          mapboxImage: 'data:image/png;base64,MAP_CAPTURE'
        })
      },
      {
        role: 'tool',
        type: 'tool',
        name: 'locationEmbeddingsQuery',
        content: JSON.stringify({
          query: 'recent clear-cut forest',
          location: 'Oregon',
          latitude: 43.8,
          longitude: -120.5,
          collectionId: 'collection-oregon',
          results: {
            results: [{
              chip_id: 'chip-abc-123',
              collection: 'Sentinel-2',
              datetime: '2025-05-12T00:00:00Z',
              score: 0.9234,
              centroid: { type: 'Point', coordinates: [-121.25, 44.5] },
              geometry: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [1, 2]]] }
            }]
          },
          indexedChips: [{ chip_id: 'chip-abc-123', thumbnail_url: 'https://signed.example/private?token=secret' }],
          areaOfInterest: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [1, 2]]] }
        })
      }
    ])

    expect(context).toContain('chip-abc-123')
    expect(context).toContain('Sentinel-2')
    expect(context).toContain('2025-05-12')
    expect(context).toContain('0.9234')
    expect(context).toContain('"latitude":44.5')
    expect(context).toContain('Visible clearing near the river')
    expect(context).toContain('Clearing')
    expect(context).not.toContain('VERY_LARGE_IMAGE_DATA')
    expect(context).not.toContain('MAP_CAPTURE')
    expect(context).not.toContain('signed.example')
    expect(context).not.toContain('[[[1,2]')
    expect(context).not.toContain('thumbnail_url')
  })

  it('retains old search context even when it is older than the conversational message window', () => {
    const history = [
      {
        role: 'tool',
        type: 'tool',
        name: 'locationEmbeddingsQuery',
        content: JSON.stringify({
          query: 'construction sites',
          results: [{ chip_id: 'chip-from-first-turn', score: 0.88 }]
        })
      },
      ...Array.from({ length: 16 }, (_, index) => ({
        role: index % 2 ? 'assistant' : 'user',
        type: index % 2 ? 'response' : 'input',
        content: `consecutive turn ${index + 1}`
      }))
    ]

    const context = buildPersistedAnalysisContext(history)
    expect(context).toContain('chip-from-first-turn')
    expect(context).toContain('construction sites')
  })

  it('includes three actual API chips without requiring thumbnail indexing to succeed', () => {
    const context = buildPersistedAnalysisContext([{
      role: 'tool',
      type: 'tool',
      name: 'locationEmbeddingsQuery',
      content: JSON.stringify({
        top_k: 3,
        indexedChips: [],
        results: {
          results: [1, 2, 3].map(index => ({
            chip_id: `chip-${index}`,
            score: 0.9 - index / 100,
            centroid: { type: 'Point', coordinates: [-120 - index, 42 + index] }
          }))
        }
      })
    }])

    for (const chipId of ['chip-1', 'chip-2', 'chip-3']) {
      expect(context).toContain(chipId)
    }
  })

  it('keeps the newest eight records and stays within the context size limit', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: 'assistant',
      type: 'resolution_search_result',
      content: JSON.stringify({ summary: `analysis-${index}` })
    }))

    const context = buildPersistedAnalysisContext(history)
    expect(context.length).toBeLessThanOrEqual(9_000)
    expect(context).toContain('analysis-9')
    expect(context).toContain('analysis-2')
    expect(context).not.toContain('analysis-0')
    expect(context).not.toContain('analysis-1')
  })

  it('ignores malformed and error-only message payloads safely', () => {
    const context = buildPersistedAnalysisContext([
      { role: 'assistant', type: 'resolution_search_result', content: '{bad json' },
      { role: 'tool', type: 'tool', name: 'locationEmbeddingsQuery', content: JSON.stringify({ error: 'LGND unavailable' }) }
    ])
    expect(context).toContain('LGND unavailable')
    expect(context).not.toContain('bad json')
  })
})
