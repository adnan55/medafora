'use client'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export type AnimatedTabItem = { value: string; label: string; icon?: LucideIcon; badge?: number | string; disabled?: boolean; content: ReactNode }
interface Props {
  tabs: AnimatedTabItem[]; defaultValue?: string; value?: string; onValueChange?: (value: string) => void
  className?: string; listClassName?: string; contentClassName?: string; indicatorId?: string
}
export function AnimatedTabs({ tabs, defaultValue, value, onValueChange, className, listClassName, contentClassName }: Props) {
  return <Tabs defaultValue={defaultValue || tabs[0]?.value} value={value} onValueChange={onValueChange} className={cn('w-full gap-5', className)}>
    <TabsList aria-label="Family health records" className={cn('h-auto! w-full flex-wrap justify-start gap-2 bg-transparent p-0', listClassName)}>
      {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled} className="min-h-11 flex-none rounded-xl border px-3 py-2 text-sm">
        {tab.icon && <tab.icon aria-hidden="true" className="size-4" />}<span>{tab.label}</span>
        {tab.badge !== undefined && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-800 text-sm">{tab.badge}</span>}
      </TabsTrigger>)}
    </TabsList>
    {tabs.map(tab => <TabsContent key={tab.value} value={tab.value} className={cn('min-w-0', contentClassName)}>{tab.content}</TabsContent>)}
  </Tabs>
}
export default AnimatedTabs
