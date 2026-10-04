'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'

interface AuditLog {
  id: string
  medicine_id: string
  checked_at: string
  result_status: string
  summary: string
  source_reference?: string
  medicines?: {
    medicine_name?: string
    salt_composition?: string
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'BANNED') return (
    <Badge variant="destructive" className="font-black text-[9px] uppercase px-2 py-0.5 rounded-full">BANNED</Badge>
  )
  if (status === 'WARNING') return (
    <Badge variant="outline" className="font-bold text-[9px] bg-amber-100 text-amber-800 border-amber-200 px-2 py-0.5 rounded-full">WARNING</Badge>
  )
  return (
    <Badge variant="outline" className="font-bold text-[9px] bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8] px-2 py-0.5 rounded-full">CLEARED</Badge>
  )
}

function DetailPanel({ log }: { log: AuditLog }) {
  const isBanned = log.result_status === 'BANNED'
  const isWarning = log.result_status === 'WARNING'

  const bannerClass = isBanned
    ? 'bg-rose-50 border-rose-200'
    : isWarning
    ? 'bg-amber-50 border-amber-200'
    : 'bg-emerald-50 border-emerald-200'

  const headlineClass = isBanned ? 'text-rose-900' : isWarning ? 'text-amber-900' : 'text-emerald-900'
  const bodyClass = isBanned ? 'text-rose-800' : isWarning ? 'text-amber-800' : 'text-emerald-800'
  const headline = isBanned
    ? 'This medicine is BANNED — do not use it'
    : isWarning
    ? 'Safety Warning — use with caution'
    : 'This medicine is Safe & Approved'

  return (
    <div className="space-y-3 pt-1">
      {/* Status banner — full width, wraps naturally */}
      <div className={`rounded-xl p-3.5 flex items-start gap-3 border ${bannerClass}`}>
        {isBanned ? (
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className={`text-xs font-extrabold ${headlineClass}`}>{headline}</p>
          <p className={`text-xs font-medium mt-1 leading-relaxed break-words ${bodyClass}`}>{log.summary}</p>
        </div>
      </div>

      {/* Metadata cards — single column on mobile, 2 col on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {log.medicines?.salt_composition && (
          <div className="bg-white rounded-xl border border-[#2F4858]/10 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/40 mb-0.5">Active Ingredients</p>
            <p className="text-xs font-semibold text-[#2F4858] leading-snug break-words">{log.medicines.salt_composition}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-[#2F4858]/10 p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/40 mb-0.5">Scanned On</p>
          <p className="text-xs font-semibold text-[#2F4858]">
            {new Date(log.checked_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        {log.source_reference && (
          <div className="col-span-1 sm:col-span-2 bg-white rounded-xl border border-[#2F4858]/10 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/40 mb-0.5">Reference & AI Model</p>
            <p className="text-xs font-medium text-[#2F4858]/70 leading-snug break-words">{log.source_reference}</p>
          </div>
        )}
      </div>

      {/* View medicine link */}
      <div className="pt-1 border-t border-[#2F4858]/10">
        <Link
          href={`/medicines/${log.medicine_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F4858] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View full medicine details
        </Link>
      </div>
    </div>
  )
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[#2F4858]/50 text-xs font-medium">
        No audit logs found. Run a deep scan to get started.
      </div>
    )
  }

  return (
    <>
      {/* ── MOBILE: Card list (no table, no horizontal scroll) ── */}
      <div className="sm:hidden divide-y divide-[#2F4858]/10">
        {logs.map((log) => {
          const isExpanded = expandedId === log.id
          return (
            <div key={log.id} className="px-4 py-3.5 space-y-2">
              {/* Row header — tap to expand */}
              <button
                className="w-full flex items-center justify-between gap-3 text-left"
                onClick={() => toggleExpand(log.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-[#2F4858] truncate">{log.medicines?.medicine_name}</p>
                  <p className="text-[10px] text-[#2F4858]/60 font-medium truncate mt-0.5">{log.medicines?.salt_composition}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={log.result_status} />
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-[#2F4858]/50" />
                    : <ChevronDown className="w-4 h-4 text-[#2F4858]/50" />}
                </div>
              </button>

              {/* Expanded detail — naturally full width */}
              {isExpanded && <DetailPanel log={log} />}
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: Table (shown only on sm+) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-[#F8FDFB] text-[#2F4858]/70 uppercase text-[10px] font-extrabold border-b border-[#2F4858]/15">
            <TableRow>
              <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Medicine</TableHead>
              <TableHead className="hidden md:table-cell px-4 py-3 font-extrabold text-[#2F4858]">Scan Date</TableHead>
              <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Verdict</TableHead>
              <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Notice</TableHead>
              <TableHead className="px-4 py-3 text-right font-extrabold text-[#2F4858]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#2F4858]/10 text-xs">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id
              return (
                <React.Fragment key={log.id}>
                  <TableRow
                    className="hover:bg-[#DDFBEF]/20 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <TableCell className="px-4 py-3 font-semibold text-[#2F4858] max-w-[180px]">
                      <p className="font-extrabold truncate">{log.medicines?.medicine_name}</p>
                      <p className="text-[11px] text-[#2F4858]/70 font-medium truncate">{log.medicines?.salt_composition}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-4 py-3 text-[#2F4858]/70 whitespace-nowrap font-medium">
                      {new Date(log.checked_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={log.result_status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[#2F4858]/80 max-w-xs">
                      <p className={isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}>{log.summary}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs font-bold text-[#2F4858] hover:bg-[#DDFBEF] rounded-lg flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(log.id) }}
                      >
                        {isExpanded
                          ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</>
                          : <><ChevronDown className="w-3.5 h-3.5" /> Details</>}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${log.id}-detail`} className="bg-[#F8FDFB]">
                      <TableCell colSpan={5} className="px-4 py-4">
                        <DetailPanel log={log} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
