import type { ReactNode } from 'react'
export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0"><h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{title}</h1>
      {description && <p className="mt-2 text-base text-muted-foreground max-w-2xl">{description}</p>}</div>
    {children && <div className="flex flex-wrap gap-2 shrink-0">{children}</div>}
  </header>
}
