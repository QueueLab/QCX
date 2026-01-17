// Auth types for the authentication system

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: AuthProvider
  createdAt: Date
  updatedAt: Date
}

export type AuthProvider = "google" | "github" | "email"

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: AuthError | null
}

export interface AuthError {
  code: string
  message: string
}

export interface MagicLinkResponse {
  success: boolean
  message: string
}

export interface OAuthResponse {
  success: boolean
  redirectUrl?: string
  error?: AuthError
}

export interface AuthCallbacks {
  onSuccess?: (user: User) => void
  onError?: (error: AuthError) => void
  onMagicLinkSent?: (email: string) => void
}
