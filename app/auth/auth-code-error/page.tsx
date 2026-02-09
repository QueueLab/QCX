import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react'

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const error = searchParams.error || 'Unexpected authentication failure'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive/20 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm font-mono text-muted-foreground break-all">
            {error}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Common Causes:</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Redirect URI mismatch in Supabase dashboard.</li>
              <li>Missing or incorrect environment variables on Vercel.</li>
              <li>OAuth code expired or already used.</li>
              <li>Cookies blocked by browser or extensions.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button asChild className="w-full">
            <Link href="/auth">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
