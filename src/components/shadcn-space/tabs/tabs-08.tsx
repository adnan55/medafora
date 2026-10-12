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
    <TabsList aria-label="Family health records" className={cn('h-auto! w-full flex-wrap justify-start gap-1 rounded-2xl border border-[#B7EED8] bg-[#DDFBEF]/60 p-1.5', listClassName)}>
      {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled} className="min-h-9 flex-none rounded-xl px-3 py-2 text-xs font-bold text-[#2F4858] data-active:bg-[#2F4858] data-active:text-[#DDFBEF] data-active:shadow-sm">
        {tab.icon && <tab.icon aria-hidden="true" className="size-4" />}<span>{tab.label}</span>
        {tab.badge !== undefined && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[#2F4858] text-xs">{tab.badge}</span>}
      </TabsTrigger>)}
    </TabsList>
    {tabs.map(tab => <TabsContent keepMounted key={tab.value} value={tab.value} className={cn('min-w-0', contentClassName)}>{tab.content}</TabsContent>)}
  </Tabs>
}
export default AnimatedTabs
