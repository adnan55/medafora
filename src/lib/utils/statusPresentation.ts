import type { ExpiryUrgency } from './expiryCalculator'

export function measurementPresentation(status?: string | null) {
  switch (status?.toUpperCase()) {
    case 'CRITICAL': return { label: 'Critical', className: 'bg-rose-100 text-rose-900 border-rose-300', color: '#be123c' }
    case 'HIGH': return { label: 'High', className: 'bg-rose-50 text-rose-900 border-rose-300', color: '#be123c' }
    case 'LOW': return { label: 'Low', className: 'bg-amber-50 text-amber-900 border-amber-300', color: '#92400e' }
    case 'ABNORMAL': return { label: 'Abnormal', className: 'bg-amber-50 text-amber-900 border-amber-300', color: '#92400e' }
    case 'NORMAL': return { label: 'Recorded normal', className: 'bg-emerald-50 text-emerald-900 border-emerald-300', color: '#047857' }
    default: return { label: 'Unclassified', className: 'bg-slate-100 text-slate-800 border-slate-300', color: '#475569' }
  }
}

export const expiryPresentation: Record<ExpiryUrgency, { badge: string; dot: string; bg: string }> = {
  EXPIRED: { badge: 'text-rose-900 bg-rose-100 border-rose-300', dot: 'bg-rose-700', bg: 'bg-rose-50 border-rose-300' },
  CRITICAL: { badge: 'text-amber-900 bg-amber-100 border-amber-300', dot: 'bg-amber-700', bg: 'bg-amber-50 border-amber-300' },
  WARNING: { badge: 'text-amber-900 bg-amber-50 border-amber-300', dot: 'bg-amber-700', bg: 'bg-amber-50 border-amber-300' },
  SAFE: { badge: 'text-emerald-900 bg-emerald-50 border-emerald-300', dot: 'bg-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
  UNKNOWN: { badge: 'text-slate-800 bg-slate-100 border-slate-300', dot: 'bg-slate-600', bg: 'bg-slate-100 border-slate-300' },
}
