'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-xl border-destructive">
             <CardHeader className="bg-destructive/10">
                 <div className="mx-auto p-2 bg-destructive rounded-full w-fit">
                    <AlertTriangle className="h-8 w-8 text-destructive-foreground" />
                 </div>
                <CardTitle className="text-destructive">Something Went Wrong</CardTitle>
                 <CardDescription className="text-destructive/80">
                    An unexpected error occurred. Please try again.
                 </CardDescription>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                    We've logged the error and our team is looking into it.
                 </p>
                 {error?.message && (
                    <pre className="text-xs text-left bg-muted p-2 rounded overflow-auto max-h-20">
                        <code>{error.message}</code>
                    </pre>
                 )}
                <Button
                    onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                    }
                    variant="destructive"
                >
                    Try Again
                </Button>
             </CardContent>
        </Card>
    </div>
  )
}
