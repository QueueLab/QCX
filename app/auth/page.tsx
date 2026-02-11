import { getCurrentUserIdOnServer } from "@/lib/auth/get-current-user"
import { redirect } from "next/navigation"
import { AuthClientPage } from "./auth-client-page"

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const userId = await getCurrentUserIdOnServer()
  const isAuthEnabled = process.env.ENABLE_AUTH === 'true'

  // If auth is disabled, redirect to home as we are always "logged in" as anonymous user
  if (!isAuthEnabled && userId) {
    redirect('/')
  }

  return <AuthClientPage />
}
