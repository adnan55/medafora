import Link from 'next/link'
export default function NotFound() {
  return <main id="main-content" tabIndex={-1} className="page-shell"><h1 className="text-2xl font-bold">Record not found</h1><p>The page may have moved, or the record is unavailable in your account.</p>
    <Link href="/" className="underline">Back to cabinet</Link></main>
}
