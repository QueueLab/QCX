'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function SWUpdateNotification() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.serwist !== undefined
    ) {
      const serwist = window.serwist;

      const onWaiting = () => {
        toast.info('A new version is available!', {
          description: 'Click reload to update to the latest version.',
          duration: Infinity,
          action: {
            label: 'Reload',
            onClick: () => {
              serwist.addEventListener("controlling", () => {
                window.location.reload();
              });
              serwist.messageSkipWaiting();
            },
          },
        });
      };

      serwist.addEventListener("waiting", onWaiting);

      return () => {
        serwist.removeEventListener("waiting", onWaiting);
      };
    }
  }, []);

  return null;
}

declare global {
  interface Window {
    serwist: any;
  }
}
