import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container orchestration
 * Returns 200 OK if the application is running
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'QCX',
    },
    { status: 200 }
  );
}
