'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-background/60 backdrop-blur-md border border-border/40 rounded-full shadow-sm hover:bg-background/80 transition-all text-[11px] font-medium text-muted-foreground hover:text-foreground group"
      >
        <Download className="w-3 h-3 transition-transform group-hover:-translate-y-0.5" />
        Install App
      </button>
    </div>
  );
}
