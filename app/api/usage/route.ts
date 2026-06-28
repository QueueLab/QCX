import { NextResponse } from 'next/server';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { getUserUsageSummary } from '@/lib/actions/usage';

export async function GET() {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await getUserUsageSummary(userId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('API Error in /api/usage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
