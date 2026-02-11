import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthCodeError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="text-muted-foreground mb-8">
        We were unable to complete the authentication process. This might be due to an expired link or a configuration issue.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Try Again</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
