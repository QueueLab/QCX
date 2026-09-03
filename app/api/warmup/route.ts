import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_FEATURES = ['image', 'vision', 'document', 'video'] as const
type SupportedFeature = (typeof SUPPORTED_FEATURES)[number]

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isSupportedFeature(value: string): value is SupportedFeature {
  return SUPPORTED_FEATURES.includes(value as SupportedFeature)
}

function isAuthorized(request: NextRequest) {
  const configuredToken = process.env.QCX_WARMUP_TOKEN

  // The endpoint remains usable without configuration because it performs no
  // provider calls and has no side effects. If a token is configured in Vercel,
  // require it for scheduled requests.
  if (!configuredToken) return true

  const authorization = request.headers.get('authorization')
  const suppliedToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : request.headers.get('x-qcx-warmup-token')

  return suppliedToken === configuredToken
}

function responseBody(features: SupportedFeature[]) {
  return {
    status: 'ok',
    service: 'QCX',
    warmedFeatures: features.map((feature) => ({
      feature,
      status: 'ready',
    })),
    timestamp: new Date().toISOString(),
    note: 'Runtime readiness only; no model inference, external provider call, or database write is performed.',
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
  }

  const requestedFeatures = request.nextUrl.searchParams.getAll('feature')
  const features = requestedFeatures.length > 0 ? requestedFeatures : [...SUPPORTED_FEATURES]
  const unsupported = features.filter((feature) => !isSupportedFeature(feature))

  if (unsupported.length > 0) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Unsupported warm-up feature',
        unsupportedFeatures: unsupported,
        supportedFeatures: SUPPORTED_FEATURES,
      },
      { status: 400 },
    )
  }

  return NextResponse.json(responseBody(features as SupportedFeature[]), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export async function HEAD(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new NextResponse(null, { status: 401 })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
