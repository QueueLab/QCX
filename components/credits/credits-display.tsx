'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/v0/use-auth';
import { Loader2 } from 'lucide-react';

interface CreditsDisplayProps {
  className?: string;
}

import { useCredits } from './credits-provider';

export function CreditsDisplay({ className }: CreditsDisplayProps) {
  const { user } = useAuth();
  const { credits, loading } = useCredits();

  if (!user) return null;

  return (
    <div className={cn("flex items-center gap-2 px-2", className)}>
        <span className="text-xs text-muted-foreground font-medium">Credits:</span>
        {loading ? (
             <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
             <Badge variant="outline" className="text-xs font-mono">
                {credits !== null ? credits.toLocaleString() : '0'}
            </Badge>
        )}
    </div>
  );
}
