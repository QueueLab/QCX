import { buildAgentCard } from '@/lib/a2a/agent-card'

function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin
    } catch {
      console.error('NEXT_PUBLIC_APP_URL must be a valid absolute URL')
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    return `${protocol}://${host}`
  }

  throw new Error('NEXT_PUBLIC_APP_URL must be configured in production')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, A2A-Version'
}

/** Return the canonical A2A agent card using the configured public origin. */
export async function GET(request: Request) {
  try {
    return Response.json(buildAgentCard(getBaseUrl(request)), { headers: corsHeaders })
  } catch (error) {
    console.error('A2A Agent Card configuration error:', error)
    return Response.json({ error: 'Agent card is not configured' }, { status: 500, headers: corsHeaders })
  }
}

/** Answer cross-origin agent-card preflight requests. */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}
