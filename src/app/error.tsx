'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" tabIndex={-1} className="page-shell"><h1 className="text-2xl font-bold">This page could not be loaded</h1>
    <p role="alert">Please retry. Your records may be temporarily unavailable.</p>
    <div className="flex gap-4 items-center"><Button onClick={reset}>Try again</Button><Link href="/" className="underline">Back to cabinet</Link></div></main>
}
