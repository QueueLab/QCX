# LGND API integration: map persistence and multi-turn context

## Scope and conclusion

This review follows a location-embedding search from the `locationEmbeddingsQuery` tool through the LGND Embeddings API, serialized chat state, persisted messages, result rendering, map navigation, and consecutive follow-up model turns. The API request path and basic result formatting already existed. The gaps were (1) LGND output was not projected onto Mapbox, and (2) follow-up preparation deliberately omitted bulky `resolution_search_result` payloads and sent only the latest ten conversational messages. This meant chip IDs/metadata or earlier resolution findings could disappear from model context even though they remained saved in the backend.

The implementation keeps chat messages as the durable source of truth rather than duplicating LGND payloads in a new table. It derives marker state from the saved tool message when a current or historical chat renders. This means a result remains retrievable with its chat, and its map annotations can be reconstructed on reload without a separate synchronization job or schema migration.

For generation, the AI SDK already supplies a successful tool's structured return value to the next step of the same `streamText` run. This change preserves that path, caps the actual result JSON at three chips, and also reconstructs a small metadata-only context from persisted messages for later turns. Thus follow-ups work both immediately after an LGND tool call and after resolution-search analysis, message-window truncation, or reopening the chat.

The request contract was checked against the [LGND Embeddings API getting-started documentation](https://lgnd.ai/lgnd-docs): location search takes latitude/longitude and accepts optional GeoJSON `geometry`; search responses expose result data. Google's companion map path follows the [Maps 3D marker API](https://developers.google.com/maps/documentation/javascript/3d/marker-add). AOI and chip polygon rendering/fit-to-bounds behavior is implemented specifically for Mapbox, as requested.

## Existing request and response path

1. `lib/agents/tools/location-embeddings.tsx` optionally geocodes a place via Mapbox, then selects LGND `search-by-text` when a semantic query is present or `search-by-location` otherwise.
2. The tool normalizes supported response envelopes (`results`, `items`, `data`, and `chips`), resolves thumbnail URLs, and returns a structured object containing the resolved latitude/longitude, raw API results, indexed chip metadata, and a readable summary.
3. `app/actions.tsx` records each tool result as an AI message with `role: tool`, the tool name, and JSON content. `onSetAIState` writes these messages to the `messages` table via `lib/actions/chat.ts` and `lib/actions/chat-db.ts`.
4. `app/search/[id]/page.tsx` reloads stored message content and tool metadata; `getUIStateFromAIState` in `app/actions.tsx` reconstructs the LGND result component. Thus backend retrieval and future chat viewing already exist, conditional on normal authenticated chat persistence.
5. Before this change, `LocationEmbeddingsSection` only rendered the result text/thumbnails. `MapData.markers` had a basic shape but no Mapbox rendering path, so the returned coordinates never became visible pins and historical rendering did not repopulate the map.

## Changes

- Add a pure payload-to-map adapter that validates latitude/longitude ranges, interprets GeoJSON centroid order as `[longitude, latitude]`, and emits stable IDs for the search-location marker and up to three chip-result markers.
- Enforce exactly `top_k: 3` at the schema/tool boundary and in geometry-retry requests. Bound result arrays in the returned LGND JSON to the first three actual API matches, and retain all available matches (the API may return fewer when the collection has fewer hits) for the model's next generation step.
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
- Rebuild a bounded compact context from the full persisted message history on each ordinary follow-up and resolution-image analysis. It retains up to eight recent LGND/resolution result summaries outside the ten-message prompt window, while omitting image bytes, signed thumbnail URLs, raw API payloads, and full GeoJSON coordinate arrays.

## Persistence and access considerations

- The full tool output (including the raw response, normalized indexed chips, and resolved search coordinates) is already stored in the chat message JSON. Reopening a saved chat reloads and replays that serialized message; the UI adapter reconstructs map markers from it.
- No standalone user-global LGND catalogue is introduced. Retrieval remains scoped to chats accessible under the existing chat authorization rules (owner, participant, or public visibility). Sharing a chat retains the existing chat visibility/access semantics.
- Marker state in React context is a render cache, not the durable record. It is intentionally repopulated from persisted messages on mount/replay rather than separately synchronized to the backend.

## Follow-up context and model handoff

- The standard follow-up path keeps the existing ten-message conversational window and continues to exclude large result blobs from ordinary chat messages. Separately, `buildPersistedAnalysisContext` scans the full AI state (including metadata restored by `/search/[id]`) on every turn.
- The extractor emits at most eight recent LGND/resolution records in a 9,000-character budget. LGND records include the query/location, collection, search coordinates, and up to three chip IDs, dates, scores, and validated centroid coordinates; resolution records include the analysis summary, extracted coordinates, COG notes, and named map features.
- It deliberately omits base64 map captures, signed thumbnail URLs, complete raw API responses, and polygon coordinate arrays. Text is bounded and JSON-escaped before it is embedded in model instructions as untrusted reference data.
- Both `researcher` follow-ups and fresh `resolutionSearch` analyses receive this context. The structured tool result remains available inside the AI SDK multi-step tool loop as well, so the next generation after an API call sees the actual returned three-result JSON, not only a future-turn summary.

## Verification

Validation completed:

- `ENCRYPTION_KEY=qcx-unit-test-only-key npx --yes bun@1.3.5 test tests-unit`: 30 passed, 0 failed, including exact top-k, three-chip context, historical-window, and resolution-search retention cases.
- Focused TypeScript checking for the changed server action, agents, tool/schema, and context utilities: passed.
- Targeted ESLint on the follow-up/context files: 0 errors. The broader production-file lint/build reports existing hook/image warnings, including in `components/chat.tsx` and the map camera effect.
- `ENCRYPTION_KEY=qcx-build-only-test-key npx next build`: passed (optimized compile, Next lint/type validation, page-data collection, and all 19 static pages). The temporary key only bypassed the repository's import-time encryption-key guard during this local build.
- No live LGND request or real API credential was used; API/result behavior is covered with mocked responses.
