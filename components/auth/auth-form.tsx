"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GitHubButton, GoogleButton } from "./social-buttons"
import { CheckCircle, AlertCircle } from "lucide-react"

interface AuthFormProps {
  title?: string
  subtitle?: string
  logo?: React.ReactNode
  onGitHubSignIn?: () => void
  onGoogleSignIn?: () => void
  onMagicLinkSubmit?: (email: string) => Promise<void>
  showGitHub?: boolean
  showGoogle?: boolean
  showMagicLink?: boolean
  isLoading?: boolean
  error?: { code: string; message: string } | null
  magicLinkSent?: boolean
  magicLinkEmail?: string | null
  onResetMagicLink?: () => void
  onResetError?: () => void
}

export function AuthForm({
  title = "Welcome",
  subtitle = "Let's get you started",
  logo,
  onGitHubSignIn,
  onGoogleSignIn,
  onMagicLinkSubmit,
  showGitHub = true,
  showGoogle = true,
  showMagicLink = true,
  isLoading: externalLoading,
  error,
  magicLinkSent = false,
  magicLinkEmail,
  onResetMagicLink,
  onResetError,
}: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [internalLoading, setInternalLoading] = useState(false)

  // Use external loading state if provided, otherwise use internal
  const isLoading = externalLoading ?? internalLoading

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onMagicLinkSubmit || !email) return

    // Clear any previous errors
    onResetError?.()

    setInternalLoading(true)
    try {
      await onMagicLinkSubmit(email)
    } finally {
      setInternalLoading(false)
    }
  }

  const handleTryDifferentEmail = () => {
    setEmail("")
    onResetMagicLink?.()
  }

  const showDivider = (showGitHub || showGoogle) && showMagicLink

  if (magicLinkSent && magicLinkEmail) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground text-balance">
            We sent a magic link to <span className="font-medium text-foreground">{magicLinkEmail}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Click the link in the email to sign in.</p>
        </div>

        <Button variant="outline" onClick={handleTryDifferentEmail} className="w-full bg-transparent">
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      {logo && <div className="mb-2">{logo}</div>}

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground text-balance">{subtitle}</p>
      </div>

      {error && (
        <div className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        {showGitHub && <GitHubButton onClick={onGitHubSignIn} disabled={isLoading} />}
        {showGoogle && <GoogleButton onClick={onGoogleSignIn} disabled={isLoading} />}

        {showDivider && (
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>
        )}

        {showMagicLink && (
          <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <Button type="submit" disabled={isLoading || !email}>
              {isLoading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
