import { createStreamableUI } from 'ai/rsc'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
}

export const locationTool = ({ uiStream, fullResponse }: ToolProps) => {
  const locations = extractLocations(fullResponse)
  if (locations.length > 0) {
    locations.forEach(location => {
      const locationLink = `<a href="#" onclick="window.renderMapToLocation(${location.latitude}, ${location.longitude})">${location.name}</a>`
      fullResponse = fullResponse.replace(location.name, locationLink)
    })
  }

  return {
    name: 'location',
    description: 'Extracts and links locations in the response',
    execute: () => {
      uiStream.update(fullResponse)
    }
  }
}

function extractLocations(response: string) {
  // Dummy implementation for extracting locations from the response
  // Replace this with actual implementation
  return [
    { name: 'Location1', latitude: 12.34, longitude: 56.78 },
    { name: 'Location2', latitude: 23.45, longitude: 67.89 }
  ]
}
