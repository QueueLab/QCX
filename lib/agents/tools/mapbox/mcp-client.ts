import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { createSmitheryUrl } from '@smithery/sdk'

export type McpClient = MCPClientClass

export async function getConnectedMcpClient(): Promise<McpClient | null> {
  const apiKey = process.env.NEXT_PUBLIC_SMITHERY_API_KEY
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  const profileId = process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID

  if (!apiKey || !mapboxAccessToken || !profileId) {
    console.error('[MCP-Client] Missing required environment variables')
    return null
  }

  let config
  try {
    const mapboxMcpConfig = await import('../../../../mapbox_mcp_config.json')
    config = {
      ...(mapboxMcpConfig.default || mapboxMcpConfig),
      mapboxAccessToken
    }
  } catch (configError: any) {
    console.error(
      '[MCP-Client] Failed to load mapbox config:',
      configError.message
    )
    config = {
      mapboxAccessToken,
      version: '1.0.0',
      name: 'mapbox-mcp-server'
    }
  }

  const smitheryUrlOptions = { config, apiKey, profileId }
  const mcpServerBaseUrl = `https://server.smithery.ai/mapbox-mcp-server/mcp?api_key=${smitheryUrlOptions.apiKey}&profile=${smitheryUrlOptions.profileId}`

  let serverUrlToUse
  try {
    serverUrlToUse = createSmitheryUrl(mcpServerBaseUrl, smitheryUrlOptions)
  } catch (urlError: any) {
    console.error('[MCP-Client] Error creating Smithery URL:', urlError.message)
    return null
  }

  let transport
  try {
    transport = new StreamableHTTPClientTransport(serverUrlToUse)
  } catch (transportError: any) {
    console.error(
      '[MCP-Client] Failed to create transport:',
      transportError.message
    )
    return null
  }

  const client = new MCPClientClass({
    name: 'MapboxToolClient',
    version: '1.0.0'
  })

  try {
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Connection timeout after 15 seconds')),
          15000
        )
      })
    ])
    return client
  } catch (connectionError: any) {
    console.error('[MCP-Client] MCP connection failed:', connectionError.message)
    await closeClient(client)
    return null
  }
}

export async function closeClient(client: MCPClientClass | null) {
  if (!client) return

  try {
    await Promise.race([
      client.close(),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Close timeout after 5 seconds')),
          5000
        )
      })
    ])
  } catch (error: any) {
    console.error('[MCP-Client] Error closing MCP client:', error.message)
  }
}
