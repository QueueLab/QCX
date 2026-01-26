# Migration Guide: Smithery to Composio

This document outlines the migration from Smithery to Composio for the Mapbox integration in QCX.

## Overview

The QCX project has migrated from using Smithery's MCP server hosting to Composio's integration platform for Mapbox functionality. This change provides better scalability, more robust authentication, and improved tool management.

## What Changed

### 1. Dependencies

**Removed:**
- `@smithery/cli` (^1.2.5)
- `@smithery/sdk` (^1.0.4)
- `smithery` (^0.5.2)

**Added:**
- `@composio/core` (^0.5.0)

### 2. Environment Variables

**Old (Smithery):**
```bash
SMITHERY_PROFILE_ID="your_smithery_profile_id_here"
SMITHERY_API_KEY="your_smithery_api_key_here"
NEXT_PUBLIC_SMITHERY_PROFILE_ID="your_smithery_profile_id_here"
NEXT_PUBLIC_SMITHERY_API_KEY="your_smithery_api_key_here"
```

**New (Composio):**
```bash
COMPOSIO_MAPBOX_AUTH_CONFIG_ID="ac_YOUR_MAPBOX_CONFIG_ID"
COMPOSIO_USER_ID="user@example.com"
MAPBOX_ACCESS_TOKEN="your_mapbox_api_key"
NEXT_PUBLIC_COMPOSIO_MAPBOX_AUTH_CONFIG_ID="ac_YOUR_MAPBOX_CONFIG_ID"
NEXT_PUBLIC_COMPOSIO_USER_ID="user@example.com"
```

### 3. Configuration Files

**mapbox_mcp_config.json**

**Old:**
```json
{
  "mcpServers": {
    "mapbox-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@ngoiyaeric/mapbox-mcp-server",
        "--key",
        "705b0222-a657-4cd2-b180-80c406cf6179",
        "--profile",
        "smooth-lemur-vfUbUE"
      ]
    }
  }
}
```

**New:**
```json
{
  "composio": {
    "mapbox": {
      "authConfigId": "ac_YOUR_MAPBOX_CONFIG_ID",
      "userId": "user@example.com",
      "description": "Composio configuration for Mapbox integration"
    }
  }
}
```

### 4. Code Changes

#### mapbox_mcp/hooks.ts

**Old Connection Method:**
```typescript
const mcp = useMcp({
  url: `https://server.smithery.ai/@Waldzell-Agentics/mcp-server/mcp?profile=${process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID}&api_key=${process.env.NEXT_PUBLIC_SMITHERY_API_KEY}`,
  debug: process.env.NODE_ENV === 'development',
  autoReconnect: true,
  autoRetry: 5000,
});
```

**New Connection Method:**
```typescript
const composioClient = getComposioClient();
const { connectionId, connectedAccount } = await initializeComposioMapbox();
```

#### Tool Execution

**Old:**
```typescript
const result = await mcp.callTool('geocode_location', {
  query: address,
  includeMapPreview: true,
});
```

**New:**
```typescript
const result = await composioClient.executeAction({
  action: 'mapbox_geocode_location',
  params: {
    query: address,
    includeMapPreview: true,
  },
  connectedAccountId: connectionId,
});
```

## Migration Steps

### Step 1: Install Composio

```bash
bun install @composio/core
```

### Step 2: Remove Smithery Dependencies

```bash
bun remove @smithery/cli @smithery/sdk smithery
```

### Step 3: Set Up Composio Account

1. Sign up at https://composio.dev
2. Create a new auth config for Mapbox
3. Select "API Key" as the authentication method
4. Note your auth config ID (starts with `ac_`)

### Step 4: Update Environment Variables

1. Copy `.env.local.example` to `.env.local` (if not already done)
2. Replace Smithery variables with Composio variables:
   ```bash
   COMPOSIO_MAPBOX_AUTH_CONFIG_ID="ac_YOUR_ACTUAL_CONFIG_ID"
   COMPOSIO_USER_ID="your_email@example.com"
   MAPBOX_ACCESS_TOKEN="your_mapbox_token"
   ```

### Step 5: Update Code References

The following files have been updated automatically:
- `mapbox_mcp/composio-mapbox.ts` (new file)
- `mapbox_mcp/hooks.ts` (updated)
- `mapbox_mcp/index.ts` (updated)
- `mapbox_mcp_config.json` (updated)
- `package.json` (updated)
- `.env.local.example` (updated)

### Step 6: Test the Integration

```bash
# Test the connection
bun run mapbox_mcp/index.ts

# Run the development server
bun run dev
```

## API Compatibility

The `useMCPMapClient` hook maintains the same interface, so existing components using it should continue to work without changes:

```typescript
const {
  isConnected,
  isLoading,
  error,
  connect,
  disconnect,
  processLocationQuery,
  geocodeLocation,
  calculateDistance,
  searchNearbyPlaces,
} = useMCPMapClient();
```

## Troubleshooting

### Issue: "Composio client not connected"

**Solution:** Ensure you've called `connect()` before using any tool functions:

```typescript
useEffect(() => {
  connect();
}, [connect]);
```

### Issue: "Invalid auth config ID"

**Solution:** Verify your `COMPOSIO_MAPBOX_AUTH_CONFIG_ID` starts with `ac_` and is copied correctly from the Composio dashboard.

### Issue: "Mapbox API key invalid"

**Solution:** Check that your `MAPBOX_ACCESS_TOKEN` is valid and has the necessary scopes enabled in your Mapbox account.

### Issue: Tool execution fails

**Solution:** Verify the action names match Composio's Mapbox integration. Common actions:
- `mapbox_geocode_location`
- `mapbox_calculate_distance`
- `mapbox_search_nearby_places`
- `mapbox_generate_map_link`

## Benefits of Composio

1. **Better Authentication Management**: Centralized auth config management
2. **Improved Security**: API keys stored securely in Composio
3. **Scalability**: Better handling of multiple integrations
4. **Monitoring**: Built-in logging and monitoring in Composio dashboard
5. **Flexibility**: Easier to add new tools and integrations

## Resources

- [Composio Documentation](https://docs.composio.dev)
- [Composio GitHub](https://github.com/ComposioHQ/composio)
- [Mapbox API Documentation](https://docs.mapbox.com)
- [QCX Documentation](https://deepwiki.com/QueueLab/QCX)

## Support

If you encounter issues during migration:
1. Check the Composio dashboard for connection status
2. Review the logs in your development console
3. Consult the [mapbox_mcp/README.md](./mapbox_mcp/README.md) file
4. Open an issue in the QCX repository

## Rollback

If you need to rollback to Smithery:

```bash
# Reinstall Smithery packages
bun install @smithery/cli@^1.2.5 @smithery/sdk@^1.0.4 smithery@^0.5.2

# Restore old environment variables in .env.local
# Restore old code from git history
git checkout HEAD~1 -- mapbox_mcp/
```

However, we recommend staying with Composio for the improved features and maintainability.
