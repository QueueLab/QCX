import type React from "react"
import { AuthForm } from "./auth-form"
import { DecorativePanel } from "./decorative-panel"

interface AuthPageProps {
  title?: string
  subtitle?: string
  logo?: React.ReactNode
  onGitHubSignIn?: () => void
  onGoogleSignIn?: () => void
  onMagicLinkSubmit?: (email: string) => Promise<void>
  showGitHub?: boolean
  showGoogle?: boolean
  showMagicLink?: boolean
  decorativePanel?: React.ReactNode
  isLoading?: boolean
  error?: { code: string; message: string } | null
  magicLinkSent?: boolean
  magicLinkEmail?: string | null
  onResetMagicLink?: () => void
  onResetError?: () => void
}

export function AuthPage({
  title,
  subtitle,
  logo,
  onGitHubSignIn,
  onGoogleSignIn,
  onMagicLinkSubmit,
  showGitHub = true,
  showGoogle = true,
  showMagicLink = true,
  decorativePanel,
  isLoading,
  error,
  magicLinkSent,
  magicLinkEmail,
  onResetMagicLink,
  onResetError,
}: AuthPageProps) {
  return (
    <div className="relative flex min-h-screen w-full">
      {logo && <div className="absolute left-6 top-6 z-10">{logo}</div>}

      {/* Left side - Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <AuthForm
          title={title}
          subtitle={subtitle}
          onGitHubSignIn={onGitHubSignIn}
          onGoogleSignIn={onGoogleSignIn}
          onMagicLinkSubmit={onMagicLinkSubmit}
          showGitHub={showGitHub}
          showGoogle={showGoogle}
          showMagicLink={showMagicLink}
          isLoading={isLoading}
          error={error}
          magicLinkSent={magicLinkSent}
          magicLinkEmail={magicLinkEmail}
          onResetMagicLink={onResetMagicLink}
          onResetError={onResetError}
        />
      </div>

      {/* Right side - Decorative */}
      <div className="hidden w-1/2 p-4 lg:block">{decorativePanel ?? <DecorativePanel />}</div>
    </div>
  )
}
