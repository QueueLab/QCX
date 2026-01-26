# Mapbox Integration with Composio

This directory contains the Composio-based Mapbox integration for QCX, replacing the previous Smithery implementation.

## Overview

The integration uses [Composio](https://composio.dev) to manage authentication and tool execution for Mapbox services. This provides a more robust and scalable approach to integrating external services.

## ⚠️ Security Warning

**IMPORTANT**: The Composio integration requires server-side environment variables (`MAPBOX_ACCESS_TOKEN`) that should **NEVER** be exposed to the client. 

- The `useMCPMapClient` hook should **NOT** be used directly in client components
- Instead, create server-side API routes that handle Composio authentication and tool execution
- Only expose necessary data to the client through your API routes

## Files

- **composio-mapbox.ts**: Core Composio client setup and authentication logic (server-side only)
- **hooks.ts**: React hooks for using Mapbox functionality (should be used server-side or via API routes)
- **index.ts**: Test script for verifying the Composio connection
- **README.md**: This file

## Environment Variables

Set the following environment variables in your `.env.local` file:

```bash
# Composio Configuration (Server-side only)
COMPOSIO_MAPBOX_AUTH_CONFIG_ID=ac_YOUR_MAPBOX_CONFIG_ID
COMPOSIO_USER_ID=user@example.com

# Mapbox Access Token (Server-side only - DO NOT expose to client)
MAPBOX_ACCESS_TOKEN=your_mapbox_api_key

# For client-side usage (if needed for display purposes only)
NEXT_PUBLIC_COMPOSIO_MAPBOX_AUTH_CONFIG_ID=ac_YOUR_MAPBOX_CONFIG_ID
NEXT_PUBLIC_COMPOSIO_USER_ID=user@example.com
```

**Note**: All environment variables are **required**. The application will fail fast with clear error messages if any are missing.

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
   - **Never commit `.env.local` to version control**

4. **Test the Connection**:
   ```bash
   bun run mapbox_mcp/index.ts
   ```

## Usage

### Server-Side API Route (Recommended)

Create a server-side API route to handle Mapbox operations:

```typescript
// app/api/mapbox/geocode/route.ts
import { initializeComposioMapbox, getComposioClient } from '@/mapbox_mcp/composio-mapbox';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    // Initialize Composio connection (server-side)
    const { connectionId } = await initializeComposioMapbox();
    const composioClient = getComposioClient();
    
    // Execute geocoding action
    const result = await composioClient.executeAction({
      action: 'mapbox_geocode_location',
      params: {
        query: address,
        includeMapPreview: true,
      },
      connectedAccountId: connectionId,
    });
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
}
```

### Client-Side Usage

Call your API route from client components:

```typescript
// components/MapSearch.tsx
'use client';

import { useState } from 'react';

export function MapSearch() {
  const [result, setResult] = useState(null);
  
  const handleGeocode = async (address: string) => {
    try {
      const response = await fetch('/api/mapbox/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
  };
  
  return (
    <div>
      <button onClick={() => handleGeocode('Eiffel Tower')}>
        Geocode Location
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

## Available Composio Actions

The following Mapbox actions are available through Composio:

- **mapbox_geocode_location**: Convert address to coordinates
- **mapbox_calculate_distance**: Calculate distance between two locations
- **mapbox_search_nearby_places**: Search for nearby places
- **mapbox_generate_map_link**: Generate map links

**Note**: Action names use the `mapbox_` prefix (e.g., `mapbox_geocode_location`), not the old MCP names (e.g., `geocode_location`).

## Migration from Smithery

The following changes were made to migrate from Smithery to Composio:

1. **Dependencies**: Replaced `@smithery/cli` and `@smithery/sdk` with `@composio/core`
2. **Authentication**: Changed from Smithery SSE transport to Composio's API Key authentication
3. **Tool Execution**: Updated tool calls to use Composio's `executeAction` method
4. **Configuration**: Replaced `mapbox_mcp_config.json` with Composio-specific configuration
5. **Security**: Added proper environment variable validation and fail-fast behavior

## Troubleshooting

### Connection Errors

- Verify all environment variables are set correctly in `.env.local`
- Check that your Composio auth config ID is valid
- Ensure your Mapbox access token has the necessary permissions
- Review error messages - the application will clearly indicate which variable is missing

### Tool Execution Errors

- Verify the action names use the `mapbox_` prefix
- Check that the connection ID is valid
- Review Composio logs in the dashboard
- Ensure parameters match the expected format

### Environment Variable Errors

If you see errors about missing environment variables:
- Check that all required variables are set in `.env.local`
- Restart your development server after adding variables
- Verify variable names match exactly (case-sensitive)

## Resources

- [Composio Documentation](https://docs.composio.dev)
- [Mapbox API Documentation](https://docs.mapbox.com)
- [QCX Documentation](https://deepwiki.com/QueueLab/QCX)
- [Migration Guide](../COMPOSIO_MIGRATION.md)

## Security Best Practices

1. **Never expose server-side environment variables to the client**
2. **Always use API routes for Composio operations**
3. **Validate and sanitize user input before passing to Composio**
4. **Implement rate limiting on your API routes**
5. **Monitor Composio usage through the dashboard**
6. **Rotate API keys regularly**
7. **Use environment-specific credentials (dev, staging, prod)**
