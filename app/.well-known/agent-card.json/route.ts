import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`

  const agentCard = {
    name: 'QCX-Terra Agent',
    description:
      'Environment-aware planetary computer platform offering geospatial analysis, remote sensing satellite imagery processing, and multi-agent exploration.',
    supportedInterfaces: [
      {
        protocolBinding: 'JSON-RPC',
        protocolVersion: '1.0',
        url: `${baseUrl}/api/a2a`
      },
      {
        protocolBinding: 'HTTP+JSON/REST',
        protocolVersion: '1.0',
        url: `${baseUrl}/api/a2a`
      }
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false
    },
    skills: [
      {
        id: 'geospatial-analysis',
        name: 'Geospatial Analysis & Mapping',
        description: 'Perform spatial queries, location search, routing, and map feature analysis.'
      },
      {
        id: 'satellite-embeddings',
        name: 'Satellite Image Vector Search',
        description: 'Natural language and vector similarity search over satellite and aerial imagery.'
      },
      {
        id: 'planet-computer',
        name: 'Planetary Computing & Forecasting',
        description: 'Provide climate forecasting, planetary model exploration, and environmental insights.'
      }
    ]
  }

  return NextResponse.json(agentCard, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, A2A-Version'
    }
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, A2A-Version'
    }
  })
}
