'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/v0/use-auth';

interface CreditsContextType {
  credits: number | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = React.createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchCredits = React.useCallback(async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/user/credits');
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      } else {
        console.error("Failed to fetch credits", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch credits", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return (
    <CreditsContext.Provider value={{ credits, loading, refreshCredits: fetchCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = React.useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
}
