export default function Loading() {
  return <main id="main-content" tabIndex={-1} className="page-shell" aria-busy="true"><p role="status">Loading your records…</p>
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl border bg-white" />)}</div></main>
}
