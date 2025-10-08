'use client'
import { ReactNode } from 'react';
import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { geospatialTool } from './tools/geospatial'
import * as turf from '@turf/turf'

interface Viewport {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: {
    sw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
  };
}

// A simple component to display the analysis results
function ViewportAnalysisResult({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    const streamableValue = createStreamableValue();
    streamableValue.done("No points of interest found in the current map view.");
    return <BotMessage content={streamableValue.value} />;
  }

  return (
    <div>
      <p className="mb-2">Found {data.length} points of interest in this area:</p>
      <ul className="list-disc pl-5 space-y-1">
        {data.map((item: any, index: number) => (
          <li key={index}>
            <strong>{item.name}</strong>
            {item.address && <span className="text-muted-foreground text-sm block">{item.address}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function viewportAnalyzer(viewport: Viewport): Promise<any> {
  const uiStream = createStreamableUI();

  // Show a spinner while we work
  uiStream.update(
    <Section title="Analyzing Viewport">
      <div className="flex items-center">
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current mr-2"></div>
        <span>Analyzing what&apos;s in the current map view...</span>
      </div>
    </Section>
  );

  const from = turf.point([viewport.bounds.sw.lng, viewport.bounds.sw.lat]);
  const to = turf.point([viewport.bounds.ne.lng, viewport.bounds.ne.lat]);
  const diagonal = turf.distance(from, to, { units: 'meters' });
  const radius = diagonal / 2;

  const categories = ['restaurant', 'cafe', 'park', 'tourist attraction', 'hotel'];
  let allResults: any[] = [];

  try {
    const searchPromises = categories.map(category =>
      geospatialTool({ uiStream }).execute({
        queryType: 'search',
        query: category,
        coordinates: {
          latitude: viewport.center.lat,
          longitude: viewport.center.lng,
        },
        radius: Math.round(radius),
        maxResults: 5, // Limit to 5 per category to not overwhelm
        includeMap: false,
      })
    );

    const results = await Promise.all(searchPromises);

    for (const toolResult of results) {
      if (toolResult.mcp_response && toolResult.mcp_response.results) {
        allResults = [...allResults, ...toolResult.mcp_response.results];
      }
    }

    // Remove duplicates based on place name
    const uniqueResults = allResults.reduce((acc: any[], current) => {
        if (!acc.find((item: any) => item.name === current.name)) {
            acc.push(current);
        }
        return acc;
    }, []);

    uiStream.done(
      <Section title="Viewport Analysis">
        <ViewportAnalysisResult data={uniqueResults} />
      </Section>
    );

    // The object returned here is not directly rendered but is stored in the AI state
    // The actual UI is what we passed to uiStream.done()
    return { summary: `Found ${uniqueResults.length} points of interest.` };

  } catch (error) {
    console.error('Viewport analysis failed:', error);
    const streamableValue = createStreamableValue();
    streamableValue.done("Sorry, I was unable to analyze the map view.");
    uiStream.done(
      <Section title="Error">
        <BotMessage content={streamableValue.value} />
      </Section>
    );
    // Return an object for AI state even on error
    return { summary: 'Analysis failed.' };
  }
}