import sys

content = open('app/actions.tsx').read()

# Replace resolution_search block
search_block = """  if (action === 'resolution_search') {
    const file = formData?.get('file') as File;
    const timezone = (formData?.get('timezone') as string) || 'UTC';

    if (!file) {
      throw new Error('No file provided for resolution search.');
    }

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    );

    const userInput = 'Analyze this map view.';
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content, type: 'input' }
      ]
    });
    messages.push({ role: 'user', content });

    const summaryStream = createStreamableValue<string>('');
    const groupeId = nanoid();

    async function processResolutionSearch() {
      try {
        const streamResult = await resolutionSearch(messages, timezone, drawnFeatures);

        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }

        const analysisResult = await streamResult.object;
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

        if (analysisResult.geoJson) {
          uiStream.append(
            <GeoJsonLayer
              id={groupeId}
              data={analysisResult.geoJson as FeatureCollection}
            />
          );
        }

        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages: CoreMessage[] = messages.map(m => {
          if (Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.filter(part => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages);
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: analysisResult.summary || 'Analysis complete.',
              type: 'response'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify({
                ...analysisResult,
                image: dataUrl
              }),
              type: 'resolution_search_result'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup'
            }
          ]
        })
      } catch (error) {
        console.error('Failed to process resolution search:', error);
        summaryStream.done('An error occurred during analysis.');
        isGenerating.done(false);
        uiStream.done();
      }
    }

    processResolutionSearch();

    uiStream.update(
      <Section title="response">
        <ResolutionImage src={dataUrl} />
        <BotMessage content={summaryStream.value} />
      </Section>
    );

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    }
  }"""

replace_block = """  if (action === 'resolution_search') {
    const mapboxFile = formData?.get('mapboxFile') as File;
    const googleFile = formData?.get('googleFile') as File;
    const legacyFile = formData?.get('file') as File;
    const timezone = (formData?.get('timezone') as string) || 'UTC';

    let mapboxDataUrl = '';
    let googleDataUrl = '';

    if (mapboxFile) {
      const buffer = await mapboxFile.arrayBuffer();
      mapboxDataUrl = `data:${mapboxFile.type};base64,${Buffer.from(buffer).toString('base64')}`;
    }
    if (googleFile) {
      const buffer = await googleFile.arrayBuffer();
      googleDataUrl = `data:${googleFile.type};base64,${Buffer.from(buffer).toString('base64')}`;
    }

    // Fallback if only 'file' was provided (backward compatibility)
    if (!mapboxDataUrl && !googleDataUrl && legacyFile) {
      const buffer = await legacyFile.arrayBuffer();
      mapboxDataUrl = `data:${legacyFile.type};base64,${Buffer.from(buffer).toString('base64')}`;
    }

    if (!mapboxDataUrl && !googleDataUrl) {
      throw new Error('No files provided for resolution search.');
    }

    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    );

    const userInput = 'Analyze this map view.';
    const contentParts: any[] = [{ type: 'text', text: userInput }]

    if (mapboxDataUrl) {
      contentParts.push({ type: 'image', image: mapboxDataUrl, mimeType: 'image/png' })
    }
    if (googleDataUrl) {
      contentParts.push({ type: 'image', image: googleDataUrl, mimeType: 'image/png' })
    }

    const content = contentParts as any

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content, type: 'input' }
      ]
    });
    messages.push({ role: 'user', content });

    const summaryStream = createStreamableValue<string>('');
    const groupeId = nanoid();

    async function processResolutionSearch() {
      try {
        const streamResult = await resolutionSearch(messages, timezone, drawnFeatures);

        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }

        const analysisResult = await streamResult.object;
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

        if (analysisResult.geoJson) {
          uiStream.append(
            <GeoJsonLayer
              id={groupeId}
              data={analysisResult.geoJson as FeatureCollection}
            />
          );
        }

        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages: CoreMessage[] = messages.map(m => {
          if (Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.filter(part => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages);
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: analysisResult.summary || 'Analysis complete.',
              type: 'response'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify({
                ...analysisResult,
                image: JSON.stringify({ mapbox: mapboxDataUrl, google: googleDataUrl })
              }),
              type: 'resolution_search_result'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup'
            }
          ]
        })
      } catch (error) {
        console.error('Failed to process resolution search:', error);
        summaryStream.done('An error occurred during analysis.');
        isGenerating.done(false);
        uiStream.done();
      }
    }

    processResolutionSearch();

    uiStream.update(
      <Section title="response">
        <ResolutionImage mapboxSrc={mapboxDataUrl} googleSrc={googleDataUrl} />
        <BotMessage content={summaryStream.value} />
      </Section>
    );

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    }
  }"""

if search_block in content:
    content = content.replace(search_block, replace_block)
else:
    print("Warning: resolution_search block not found!")

# Replace resolution_search_result in getUIStateFromAIState
search_ui = """            case 'resolution_search_result': {
              const analysisResult = JSON.parse(content as string);
              const geoJson = analysisResult.geoJson as FeatureCollection;
              const image = analysisResult.image as string;

              return {
                id,
                component: (
                  <>
                    {image && <ResolutionImage src={image} />}
                    {geoJson && (
                      <GeoJsonLayer id={id} data={geoJson} />
                    )}
                  </>
                )
              }
            }"""

replace_ui = """            case 'resolution_search_result': {
              const analysisResult = JSON.parse(content as string);
              const geoJson = analysisResult.geoJson as FeatureCollection;
              const imageData = analysisResult.image as string;
              let mapboxSrc = '';
              let googleSrc = '';

              if (imageData) {
                try {
                  const parsed = JSON.parse(imageData);
                  mapboxSrc = parsed.mapbox || '';
                  googleSrc = parsed.google || '';
                } catch (e) {
                  // Fallback for older image format which was just a single string
                  mapboxSrc = imageData;
                }
              }

              return {
                id,
                component: (
                  <>
                    {(mapboxSrc || googleSrc) && (
                      <ResolutionImage mapboxSrc={mapboxSrc} googleSrc={googleSrc} />
                    )}
                    {geoJson && (
                      <GeoJsonLayer id={id} data={geoJson} />
                    )}
                  </>
                )
              }
            }"""

if search_ui in content:
    content = content.replace(search_ui, replace_ui)
else:
    print("Warning: resolution_search_result block not found!")

with open('app/actions.tsx', 'w') as f:
    f.write(content)
