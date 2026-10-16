import { mock } from 'bun:test'

class MockNextRequest extends Request {}

class MockNextResponse extends Response {
  static json(body: any, init?: any) {
    return new Response(JSON.stringify(body), {
      status: init?.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    })
  }
}

mock.module('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse
}))

mock.module('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_noStore: () => {}
}))

mock.module('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: 'user_123' }),
  currentUser: async () => ({ id: 'user_123', emailAddresses: [] }),
  clerkClient: async () => ({})
}))
