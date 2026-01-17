'use client'

import { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    // Check if it's already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone

    // Check if the prompt was already dismissed this session
    const isDismissed = sessionStorage.getItem('ios-pwa-prompt-dismissed')

    if (isIOS && !isStandalone && !isDismissed) {
      setShowPrompt(true)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('ios-pwa-prompt-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:max-w-sm md:left-auto">
      <div className="bg-background border rounded-lg shadow-lg p-4 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-md">
            <Share className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Install QCX</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tap <span className="inline-block bg-muted px-1 rounded mx-1">Share</span> then <span className="font-semibold">Add to Home Screen</span> to install as an app.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
