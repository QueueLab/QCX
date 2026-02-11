'use client';

import { VercelToolbar } from '@vercel/toolbar/next';
import { useCurrentUser } from '@/lib/auth/use-current-user';

export function VercelToolbarWrapper() {
  const { user, loading } = useCurrentUser();

  if (loading) return null;

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const isEmployee = !!user;

  if (isDevelopment || isPreview || isEmployee) {
    return <VercelToolbar />;
  }

  return null;
}
