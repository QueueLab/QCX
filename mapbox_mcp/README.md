# Mapbox Integration with Composio

This directory contains the Composio-based Mapbox integration for QCX, replacing the previous Smithery implementation.

## Overview

The integration uses [Composio](https://composio.dev) to manage authentication and tool execution for Mapbox services. This provides a more robust and scalable approach to integrating external services.

## Files

- **composio-mapbox.ts**: Core Composio client setup and authentication logic
- **hooks.ts**: React hooks for using Mapbox functionality in components
- **index.ts**: Test script for verifying the Composio connection
- **README.md**: This file

## Environment Variables

Set the following environment variables in your `.env.local` file:

```bash
# Composio Configuration
COMPOSIO_MAPBOX_AUTH_CONFIG_ID=ac_YOUR_MAPBOX_CONFIG_ID
COMPOSIO_USER_ID=user@example.com

# Mapbox Access Token
MAPBOX_ACCESS_TOKEN=your_mapbox_api_key

# For client-side usage (if needed)
NEXT_PUBLIC_COMPOSIO_MAPBOX_AUTH_CONFIG_ID=ac_YOUR_MAPBOX_CONFIG_ID
NEXT_PUBLIC_COMPOSIO_USER_ID=user@example.com
```

## Setup

1. **Install Composio SDK**:
   ```bash
   bun install @composio/core
   ```

2. **Create Mapbox Auth Config in Composio**:
   - Sign up for a Composio account at https://composio.dev
   - Create an auth config for Mapbox with API Key authentication
   - Note the auth config ID (starts with `ac_`)

3. **Set Environment Variables**:
   - Copy the values from your Composio dashboard
   - Add your Mapbox access token from https://account.mapbox.com

4. **Test the Connection**:
   ```bash
   bun run mapbox_mcp/index.ts
   ```

## Usage

### In React Components

```typescript
import { useMCPMapClient } from '@/mapbox_mcp/hooks';

function MyComponent() {
  const { 
    isConnected, 
    isLoading, 
    error, 
    connect, 
    geocodeLocation 
  } = useMCPMapClient();

  useEffect(() => {
    connect();
  }, [connect]);

  const handleGeocode = async () => {
    try {
      const result = await geocodeLocation('Eiffel Tower');
      console.log(result);
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  };

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      <button onClick={handleGeocode}>Geocode Location</button>
    </div>
  );
}
```

### Available Functions

- **connect()**: Initialize connection to Composio Mapbox
- **disconnect()**: Close the connection
- **processLocationQuery(query: string)**: Process natural language location queries
- **geocodeLocation(address: string)**: Convert address to coordinates
- **calculateDistance(from: string, to: string, profile: 'driving' | 'walking' | 'cycling')**: Calculate distance between two locations
- **searchNearbyPlaces(location: string, query: string, radius?: number, limit?: number)**: Search for nearby places

## Migration from Smithery

The following changes were made to migrate from Smithery to Composio:

1. **Dependencies**: Replaced `@smithery/cli` and `@smithery/sdk` with `@composio/core`
2. **Authentication**: Changed from Smithery SSE transport to Composio's API Key authentication
3. **Tool Execution**: Updated tool calls to use Composio's `executeAction` method
4. **Configuration**: Replaced `mapbox_mcp_config.json` with Composio-specific configuration

## Troubleshooting

### Connection Errors

- Verify environment variables are set correctly
- Check that your Composio auth config ID is valid
- Ensure your Mapbox access token has the necessary permissions

### Tool Execution Errors

- Verify the action names match Composio's Mapbox integration
- Check that the connection ID is valid
- Review Composio logs in the dashboard

## Resources

- [Composio Documentation](https://docs.composio.dev)
- [Mapbox API Documentation](https://docs.mapbox.com)
- [QCX Documentation](https://deepwiki.com/QueueLab/QCX)
