import { describe, expect, it } from 'bun:test'
import { buildLocationEmbeddingsMapUpdate } from '../lib/utils/location-embeddings-map'

const aoi = {
  type: 'Polygon',
  coordinates: [[[-124.6, 41.9], [-116.4, 41.9], [-116.4, 46.3], [-124.6, 46.3], [-124.6, 41.9]]]
} as const

describe('LGND map result adapter', () => {
  it('flies to exact search coordinates while exposing the AOI and chip footprint', () => {
    const result = buildLocationEmbeddingsMapUpdate({
      location: 'Oregon',
      latitude: 43.8041,
      longitude: -120.5542,
      areaOfInterest: aoi,
      results: {
        data: [{
          chip_id: 'chip-oregon-1',
          collection: 'naip',
          datetime: '2022-06-01T00:00:00Z',
          score: 0.91,
          centroid: { type: 'Point', coordinates: [-121.25, 44.5] },
          geometry: {
            type: 'Polygon',
            coordinates: [[[-121.3, 44.4], [-121.2, 44.4], [-121.2, 44.6], [-121.3, 44.6], [-121.3, 44.4]]]
          }
        }]
      }
    })

    expect(result?.targetPosition).toEqual({ lat: 43.8041, lng: -120.5542 })
    expect(result?.targetGeometry).toEqual(aoi)
    expect(result?.features).toHaveLength(2)
    expect(result?.features.map(feature => feature.source)).toEqual(['lgnd-aoi', 'lgnd-chip'])
    expect(result?.markers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lgnd:search:43.8041:-120.5542', latitude: 43.8041, longitude: -120.5542 }),
      expect.objectContaining({
        id: 'lgnd:chip:chip-oregon-1',
        latitude: 44.5,
        longitude: -121.25,
        geometry: expect.objectContaining({ type: 'Polygon' })
      })
    ]))
  })

  it('uses the AOI center when search coordinates are absent and validates GeoJSON bounds', () => {
    const result = buildLocationEmbeddingsMapUpdate({ areaOfInterest: aoi, results: [] })
    expect(result?.targetPosition?.lat).toBeCloseTo(44.1)
    expect(result?.targetPosition?.lng).toBeCloseTo(-120.5)
    expect(result?.features[0].geometry).toEqual(aoi)

    const invalid = buildLocationEmbeddingsMapUpdate({
      latitude: 100,
      longitude: 181,
      results: [{ chip_id: 'bad', centroid: { coordinates: [181, 100] } }]
    })
    expect(invalid?.targetPosition).toBeUndefined()
    expect(invalid?.markers).toEqual([])
  })

  it('falls back to the first valid result centroid and ignores error payloads', () => {
    const result = buildLocationEmbeddingsMapUpdate({
      results: [{ chip_id: 'first', centroid: { coordinates: [-73.9857, 40.7484] } }]
    })
    expect(result?.targetPosition).toEqual({ lat: 40.7484, lng: -73.9857 })
    expect(buildLocationEmbeddingsMapUpdate({ error: 'failed' })).toBeNull()
    expect(buildLocationEmbeddingsMapUpdate(null)).toBeNull()
  })
})
