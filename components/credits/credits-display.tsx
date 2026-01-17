'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/v0/use-auth';
import { Loader2 } from 'lucide-react';

interface CreditsDisplayProps {
  className?: string;
}

export function CreditsDisplay({ className }: CreditsDisplayProps) {
  const { user } = useAuth();
  const [credits, setCredits] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchCredits() {
        if (!user) return;
        try {
            const response = await fetch('/api/user/credits');
            if (response.ok) {
                const data = await response.json();
                setCredits(data.credits);
            }
        } catch (error) {
            console.error("Failed to fetch credits", error);
        } finally {
            setLoading(false);
        }
    }

    fetchCredits();
  }, [user]);

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
