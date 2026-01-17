'use client'

import React, { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'

export function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect iOS
    const userAgent = window.navigator.userAgent
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent)

    // Detect if already in standalone mode (installed)
    const isInStandaloneMode =
      (window.navigator as any).standalone ||
      window.matchMedia('(display-mode: standalone)').matches

    // Check if prompt was dismissed recently
    const isPromptDismissed = localStorage.getItem('iosPwaPromptDismissed')

    if (isIosDevice && !isInStandaloneMode && !isPromptDismissed) {
      setShowPrompt(true)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('iosPwaPromptDismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-background border shadow-2xl p-4 pr-10">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-primary/10 p-2 rounded-xl">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              Q
            </div>
          </div>

          <div className="flex-grow pt-1">
            <h3 className="text-sm font-semibold leading-none mb-1">Install QCX</h3>
            <p className="text-xs text-muted-foreground leading-snug">
              Add this app to your home screen for a better experience.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>Tap the Share icon</span>
          <div className="bg-muted p-1 rounded-md">
            <Share className="h-3 w-3" />
          </div>
          <span>then scroll down and select</span>
          <span className="font-semibold text-foreground">&quot;Add to Home Screen&quot;</span>
        </div>
      </div>
    </div>
  )
}
