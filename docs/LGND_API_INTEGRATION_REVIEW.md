# LGND API integration: technical review and map persistence

## Scope and conclusion

This review follows a location-embedding search from the `locationEmbeddingsQuery` tool through the LGND Embeddings API, serialized chat state, persisted messages, result rendering, and map navigation. The API request path and basic result formatting already existed. The important gap was the boundary between a successful LGND tool result and the map: unlike the geospatial tool, the LGND result component did not publish its location/centroid coordinates to map state, and the Mapbox map did not render the existing `MapData.markers` field.

The implementation keeps chat messages as the durable source of truth rather than duplicating LGND payloads in a new table. It derives marker state from the saved tool message when a current or historical chat renders. This means a result remains retrievable with its chat, and its map annotations can be reconstructed on reload without a separate synchronization job or schema migration.

The request contract was checked against the [LGND Embeddings API getting-started documentation](https://lgnd.ai/lgnd-docs): location search takes latitude/longitude and accepts optional GeoJSON `geometry`; search responses expose result data. Google's companion map path follows the [Maps 3D marker API](https://developers.google.com/maps/documentation/javascript/3d/marker-add). AOI and chip polygon rendering/fit-to-bounds behavior is implemented specifically for Mapbox, as requested.

## Existing request and response path

1. `lib/agents/tools/location-embeddings.tsx` optionally geocodes a place via Mapbox, then selects LGND `search-by-text` when a semantic query is present or `search-by-location` otherwise.
2. The tool normalizes supported response envelopes (`results`, `items`, `data`, and `chips`), resolves thumbnail URLs, and returns a structured object containing the resolved latitude/longitude, raw API results, indexed chip metadata, and a readable summary.
3. `app/actions.tsx` records each tool result as an AI message with `role: tool`, the tool name, and JSON content. `onSetAIState` writes these messages to the `messages` table via `lib/actions/chat.ts` and `lib/actions/chat-db.ts`.
4. `app/search/[id]/page.tsx` reloads stored message content and tool metadata; `getUIStateFromAIState` in `app/actions.tsx` reconstructs the LGND result component. Thus backend retrieval and future chat viewing already exist, conditional on normal authenticated chat persistence.
5. Before this change, `LocationEmbeddingsSection` only rendered the result text/thumbnails. `MapData.markers` had a basic shape but no Mapbox rendering path, so the returned coordinates never became visible pins and historical rendering did not repopulate the map.

## Changes

- Add a pure payload-to-map adapter that validates latitude/longitude ranges, interprets GeoJSON centroid order as `[longitude, latitude]`, and emits stable IDs for the search-location marker and up to three chip-result markers.
- On initial and replayed result rendering, merge these markers into the map context and set the map target to the exact search coordinate. If no search coordinate is present, use the first valid result centroid as the fly-to target.
- Send the geocoded AOI polygon as an optional LGND `geometry` constraint for location searches too, preserve both the submitted search geometry and any distinct AOI geometry returned by LGND in the serialized tool result, and fall back to the unbounded point/text request if LGND rejects only that geometry constraint.
- Render and clean up the AOI and chip footprints on Mapbox, fitting the camera to the AOI by default. The search coordinate remains marked; selecting a chip's “Fly to image” action (or its map pin) fits that chip footprint or flies to its centroid. Pin popups include relevant collection/date/score/coordinate metadata.
- Render the same persisted marker set on the existing Google 3D map using `Marker3DElement`, and prioritize the explicit LGND target over the previously saved camera state for camera navigation.
- Keep the existing chat-message persistence contract; no migration, external write, or additional LGND request is introduced by map restoration.

## Coordinate and data-integrity rules

- Search inputs in the LGND request use named `latitude` and `longitude` fields; map APIs consume `{lat, lng}`; Mapbox marker APIs consume `[lng, lat]`; GeoJSON centroids are read as `[lng, lat]`. The adapter performs the explicit conversion and rejects non-finite or out-of-range values.
- Search-location markers represent the requested/geocoded search point. Chip markers represent LGND result centroids, which can differ from the searched point. Both can be shown together; a chip centroid does not silently replace the location point when the latter exists.
- Result markers are limited to the top three, matching the current UI/tool summary contract, and are not dependent on thumbnail URL success.
- Selecting a result is an explicit user action that changes the target from the overall AOI to that chip's polygon footprint, or to its centroid where no footprint is returned.
- Stable marker IDs deduplicate a chip returned by multiple historical results while preserving separate search-point pins by coordinate.

## Persistence and access considerations

- The full tool output (including the raw response, normalized indexed chips, and resolved search coordinates) is already stored in the chat message JSON. Reopening a saved chat reloads and replays that serialized message; the UI adapter reconstructs map markers from it.
- No standalone user-global LGND catalogue is introduced. Retrieval remains scoped to chats accessible under the existing chat authorization rules (owner, participant, or public visibility). Sharing a chat retains the existing chat visibility/access semantics.
- Marker state in React context is a render cache, not the durable record. It is intentionally repopulated from persisted messages on mount/replay rather than separately synchronized to the backend.

## Verification

Unit coverage exercises valid search points, GeoJSON coordinate order, invalid coordinates, result-only fly-to fallback, and error-payload handling. Existing LGND request tests continue to verify the API endpoint selection, geocoding, thumbnail enrichment, bounds fallback, and human-readable response payload. Type checking and unit tests should run in CI with repository dependencies installed; a live LGND request is not required to test map restoration and is not issued by this review.
