'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

export function SWUpdateNotification() {
  const [hasShown, setHasShown] = useState(false);

  const showToast = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.serwist !== undefined
    ) {
      const serwist = window.serwist;

      const onWaiting = () => {
        // Only show the toast once per session to avoid popping up too often
        if (!hasShown) {
          setHasShown(true);
          toast.info('A new version is available!', {
            description: 'Click reload to update to the latest version.',
            duration: 15000, // Auto-dismiss after 15 seconds instead of staying forever
            position: 'bottom-left', // Show on the left side instead of right
            action: {
              label: 'Reload',
              onClick: () => {
                serwist.addEventListener("controlling", () => {
                  window.location.reload();
                });
                serwist.messageSkipWaiting();
              },
            },
            cancel: {
              label: 'Cancel',
              onClick: () => {
                // User dismissed the notification
              },
            },
          });
        }
      };

      serwist.addEventListener("waiting", onWaiting);

      return () => {
        serwist.removeEventListener("waiting", onWaiting);
      };
    }
  }, [hasShown]);

  useEffect(() => {
    showToast();
  }, [showToast]);

  return null;
}

declare global {
  interface Window {
    serwist: any;
  }
}
