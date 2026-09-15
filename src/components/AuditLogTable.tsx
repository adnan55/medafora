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

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (!logs || logs.length === 0) {
    return (
      <Table>
        <TableHeader className="bg-[#F8FDFB] text-[#2F4858]/70 uppercase text-[10px] font-extrabold border-b border-[#2F4858]/15">
          <TableRow>
            <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Medicine & Salt</TableHead>
            <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Scan Date</TableHead>
            <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Verdict</TableHead>
            <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Regulatory Findings & Notice</TableHead>
            <TableHead className="px-4 py-3 text-right font-extrabold text-[#2F4858]">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="px-4 py-8 text-center text-[#2F4858]/50 text-xs font-medium">
              No audit logs found. Run a deep scan to get started.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="overflow-x-auto w-full">
      <Table className="min-w-full">
        <TableHeader className="bg-[#F8FDFB] text-[#2F4858]/70 uppercase text-[10px] font-extrabold border-b border-[#2F4858]/15">
          <TableRow>
            <TableHead className="px-3 sm:px-4 py-3 font-extrabold text-[#2F4858]">Medicine</TableHead>
            <TableHead className="hidden md:table-cell px-4 py-3 font-extrabold text-[#2F4858]">Scan Date</TableHead>
            <TableHead className="px-2 sm:px-4 py-3 font-extrabold text-[#2F4858]">Verdict</TableHead>
            <TableHead className="hidden sm:table-cell px-4 py-3 font-extrabold text-[#2F4858]">Notice</TableHead>
            <TableHead className="px-2 sm:px-4 py-3 text-right font-extrabold text-[#2F4858]"></TableHead>
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
                  <TableCell className="px-3 sm:px-4 py-3 font-semibold text-[#2F4858] max-w-[120px] sm:max-w-none">
                    <p className="font-extrabold truncate">{log.medicines?.medicine_name}</p>
                    <p className="text-[10px] sm:text-[11px] text-[#2F4858]/80 font-medium truncate">
                      {log.medicines?.salt_composition}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-4 py-3 text-[#2F4858]/70 whitespace-nowrap font-medium">
                    {new Date(log.checked_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    {log.result_status === 'BANNED' ? (
                      <Badge variant="destructive" className="font-black text-[9px] sm:text-[10px] uppercase px-1.5 sm:px-2 py-0.5 rounded-full">
                        BANNED
                      </Badge>
                    ) : log.result_status === 'WARNING' ? (
                      <Badge variant="outline" className="font-bold text-[9px] sm:text-[10px] bg-amber-100 text-amber-800 border-amber-200 px-1.5 sm:px-2 py-0.5 rounded-full">
                        WARNING
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-bold text-[9px] sm:text-[10px] bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8] px-1.5 sm:px-2 py-0.5 rounded-full">
                        CLEARED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-4 py-3 text-[#2F4858]/90 max-w-[200px]">
                    <p className={isExpanded ? '' : 'line-clamp-2'}>{log.summary}</p>
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold text-[#2F4858] hover:bg-[#DDFBEF] rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(log.id)
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Collapse</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Details</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>

              {/* Expanded Detail Row */}
              {isExpanded && (
                <TableRow key={`${log.id}-detail`} className="bg-[#F8FDFB]">
                  <TableCell colSpan={5} className="px-4 py-4">
                    <div className="rounded-xl border border-[#2F4858]/10 bg-white p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        {log.result_status === 'BANNED' ? (
                          <ShieldAlert className="w-5 h-5 text-rose-500" />
                        ) : log.result_status === 'WARNING' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        )}
                        <h4 className="text-sm font-extrabold text-[#2F4858]">
                          {log.medicines?.medicine_name} — Detailed Regulatory Report
                        </h4>
                      </div>

                      {/* Salt Composition */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/50">Active Salt Composition</p>
                        <p className="text-xs font-semibold text-[#2F4858]">{log.medicines?.salt_composition || 'Not available'}</p>
                      </div>

                      {/* Full Regulatory Finding */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/50">AI Regulatory Finding</p>
                        <p className="text-xs text-[#2F4858] leading-relaxed font-medium whitespace-pre-wrap">
                          {log.summary}
                        </p>
                      </div>

                      {/* Source Reference */}
                      {log.source_reference && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/50">Source & Model Reference</p>
                          <p className="text-xs text-[#2F4858]/80 font-medium">{log.source_reference}</p>
                        </div>
                      )}

                      {/* Scan Timestamp */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/50">Scanned At</p>
                        <p className="text-xs text-[#2F4858]/80 font-medium">
                          {new Date(log.checked_at).toLocaleString('en-IN', {
                            dateStyle: 'full',
                            timeStyle: 'medium',
                          })}
                        </p>
                      </div>

                      {/* View Medicine Link */}
                      <div className="pt-2 border-t border-[#2F4858]/10">
                        <Link
                          href={`/medicines/${log.medicine_id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F4858] hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Full Medicine Details & Batch Info
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
    </div>
  )
}
