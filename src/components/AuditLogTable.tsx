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
                  <TableCell colSpan={5} className="px-3 sm:px-4 py-3">

                    {/* Status banner */}
                    <div className={`rounded-xl p-3.5 mb-3 flex items-start gap-3 border ${
                      log.result_status === 'BANNED'
                        ? 'bg-rose-50 border-rose-200'
                        : log.result_status === 'WARNING'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      {log.result_status === 'BANNED' ? (
                        <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      ) : log.result_status === 'WARNING' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-xs font-extrabold ${
                          log.result_status === 'BANNED' ? 'text-rose-900'
                          : log.result_status === 'WARNING' ? 'text-amber-900'
                          : 'text-emerald-900'
                        }`}>
                          {log.result_status === 'BANNED'
                            ? 'This medicine is BANNED — do not use it'
                            : log.result_status === 'WARNING'
                            ? 'Safety Warning — use with caution'
                            : 'This medicine is Safe & Approved'}
                        </p>
                        <p className={`text-xs font-medium mt-1 leading-relaxed ${
                          log.result_status === 'BANNED' ? 'text-rose-800'
                          : log.result_status === 'WARNING' ? 'text-amber-800'
                          : 'text-emerald-800'
                        }`}>
                          {log.summary}
                        </p>
                      </div>
                    </div>

                    {/* Metadata row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                      {log.medicines?.salt_composition && (
                        <div className="bg-white rounded-xl border border-[#2F4858]/10 p-3 space-y-0.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/40">Active Ingredients</p>
                          <p className="text-xs font-semibold text-[#2F4858] leading-snug">{log.medicines.salt_composition}</p>
                        </div>
                      )}

                      <div className="bg-white rounded-xl border border-[#2F4858]/10 p-3 space-y-0.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/40">Scanned On</p>
                        <p className="text-xs font-semibold text-[#2F4858]">
                          {new Date(log.checked_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>

                      {log.source_reference && (
                        <div className="sm:col-span-2 bg-white rounded-xl border border-[#2F4858]/10 p-3 space-y-0.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F4858]/40">Reference & AI Model</p>
                          <p className="text-xs font-medium text-[#2F4858]/70 leading-snug">{log.source_reference}</p>
                        </div>
                      )}

                    </div>

                    {/* View medicine link */}
                    <div className="mt-3 pt-3 border-t border-[#2F4858]/10">
                      <Link
                        href={`/medicines/${log.medicine_id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F4858] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View full medicine details
                      </Link>
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
