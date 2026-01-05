// Auth service - Replace these implementations with your actual auth provider
// Compatible with: NextAuth.js, Supabase Auth, Firebase Auth, Custom JWT, etc.

import { getSupabaseBrowserClient } from "../../supabase/browser-client"
import type { User, MagicLinkResponse, OAuthResponse, AuthProvider } from "./types"

const supabase = getSupabaseBrowserClient()

// Configuration - set these based on your auth provider
export const AUTH_CONFIG = {
  callbackUrl: "/dashboard",
  errorUrl: "/auth/error",
}

/**
 * Send magic link to email
 * Replace with your actual implementation:
 * - Supabase: supabase.auth.signInWithOtp({ email })
 * - NextAuth: signIn("email", { email })
 * - Custom: POST to your magic link endpoint
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResponse> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        message: error.message || "Failed to send magic link",
      }
    }

    return {
      success: true,
      message: "Check your email for the magic link!",
    }
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please try again.",
    }
  }
}

/**
 * Initiate Google OAuth flow
 * Replace with your actual implementation:
 * - Supabase: supabase.auth.signInWithOAuth({ provider: 'google' })
 * - NextAuth: signIn("google")
 * - Custom: Redirect to your OAuth endpoint
 */
export async function signInWithGoogle(): Promise<OAuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message,
        },
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "OAUTH_ERROR",
        message: "Failed to initiate Google sign in",
      },
    }
  }
}

/**
 * Initiate GitHub OAuth flow
 * Replace with your actual implementation
 */
export async function signInWithGitHub(): Promise<OAuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message,
        },
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "OAUTH_ERROR",
        message: "Failed to initiate GitHub sign in",
      },
    }
  }
}

/**
 * Get current user session
 * Replace with your actual implementation:
 * - Supabase: supabase.auth.getUser()
 * - NextAuth: getSession()
 * - Custom: Fetch from your session endpoint
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      avatar: user.user_metadata?.avatar_url || "",
      provider: (user.app_metadata?.provider as AuthProvider) || "email",
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at),
    }
  } catch {
    return null
  }
}

/**
 * Sign out the current user
 * Replace with your actual implementation
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut()
    window.location.href = "/"
  } catch (error) {
    console.error("Sign out failed:", error)
  }
}
