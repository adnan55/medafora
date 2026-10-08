import { calculateExpiryStatus } from './expiryCalculator'

export const abnormalStatuses = new Set(['HIGH', 'LOW', 'ABNORMAL', 'CRITICAL'])
export function isAbnormal(status?: string) { return abnormalStatuses.has(String(status).toUpperCase()) }

export function assessHealth(biomarkers: { status?: string }[], vitals: { status?: string }[], medicines: { is_banned?: boolean; expiry_date?: string }[], warnings: string[]) {
  if (warnings.length || [...biomarkers, ...vitals].some(v => v.status === 'CRITICAL') || medicines.some(m => m.is_banned || calculateExpiryStatus(m.expiry_date || '').urgency === 'EXPIRED')) return 'ATTENTION_REQUIRED'
  if ([...biomarkers, ...vitals].some(v => isAbnormal(v.status))) return 'MODERATE_ATTENTION'
  return 'INSUFFICIENT_DATA'
}
