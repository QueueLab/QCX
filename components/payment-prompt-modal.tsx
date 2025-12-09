'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUsageMonitor } from './usage-monitor-context'
import { CreditCard, Sparkles } from 'lucide-react'

export function PaymentPromptModal() {
  const { showPaymentPrompt, setShowPaymentPrompt, resetClickCount } = useUsageMonitor()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpgrade = async () => {
    setIsProcessing(true)
    
    try {
      // Call Stripe checkout API
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        console.error('Failed to create checkout session')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setShowPaymentPrompt(false)
  }

  return (
    <Dialog open={showPaymentPrompt} onOpenChange={setShowPaymentPrompt}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Unlock Full Access
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            You&apos;ve reached the free usage limit. Upgrade now to continue enjoying unlimited access to QCX features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">✓</div>
              <div>
                <p className="font-medium">Unlimited AI Conversations</p>
                <p className="text-sm text-muted-foreground">Chat without limits</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">✓</div>
              <div>
                <p className="font-medium">Advanced Map Features</p>
                <p className="text-sm text-muted-foreground">Full geospatial capabilities</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">✓</div>
              <div>
                <p className="font-medium">Priority Support</p>
                <p className="text-sm text-muted-foreground">Get help when you need it</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Upgrade Now'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
