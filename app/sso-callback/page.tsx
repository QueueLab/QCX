'use client'

import { Suspense } from 'react'
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AuthenticateWithRedirectCallback />
    </Suspense>
  )
}
