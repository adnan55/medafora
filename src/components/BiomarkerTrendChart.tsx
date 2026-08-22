'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Heart,
  Droplet,
  Percent,
  Weight,
  Wind,
  Thermometer,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Filter,
  Plus,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogVitalModal } from '@/components/LogVitalModal'
import { deleteVitalLog } from '@/app/actions/vitals'

interface BiomarkerTrendChartProps {
  familyMemberId: string
  familyMemberName: string
  vitalLogs: any[]
  medicalRecords: any[]
}

export function BiomarkerTrendChart({
  familyMemberId,
  familyMemberName,
  vitalLogs,
  medicalRecords,
}: BiomarkerTrendChartProps) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('BLOOD_GLUCOSE')
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Extract biomarkers from medical records and merge with vitalLogs
  const allDataPoints = useMemo(() => {
    const list: Array<{
      id: string
      date: string
      timestamp: number
      vitalType: string
      name: string
      value: number
      valueSecondary?: number
      unit: string
      context?: string
      status: string
      source: 'AT_HOME' | 'LAB_REPORT'
      notes?: string
    }> = []

    // 1. Add At-Home Vital Logs
    vitalLogs.forEach((v) => {
      list.push({
        id: v.id,
        date: v.recorded_at,
        timestamp: new Date(v.recorded_at).getTime(),
        vitalType: v.vital_type,
        name: v.name,
        value: Number(v.value),
        valueSecondary: v.value_secondary ? Number(v.value_secondary) : undefined,
        unit: v.unit,
        context: v.context || 'At-Home Check',
        status: v.status,
        source: 'AT_HOME',
        notes: v.notes,
      })
    })

    // 2. Add Extracted Biomarkers from Lab Reports
    medicalRecords.forEach((rec) => {
      const biomarkers = Array.isArray(rec.biomarkers) ? rec.biomarkers : []
      const recDate = rec.test_date || rec.created_at

      biomarkers.forEach((bm: any, idx: number) => {
        const bmNameLower = (bm.name || '').toLowerCase()
        let detectedType = ''

        if (bmNameLower.includes('glucose') || bmNameLower.includes('sugar') || bmNameLower.includes('fbs') || bmNameLower.includes('ppbs')) {
          detectedType = 'BLOOD_GLUCOSE'
        } else if (bmNameLower.includes('hba1c') || bmNameLower.includes('glycated')) {
          detectedType = 'HBA1C'
        } else if (bmNameLower.includes('blood pressure') || bmNameLower.includes('bp')) {
          detectedType = 'BLOOD_PRESSURE'
        } else if (bmNameLower.includes('cholesterol') || bmNameLower.includes('lipid') || bmNameLower.includes('ldl') || bmNameLower.includes('triglyceride')) {
          detectedType = 'CHOLESTEROL'
        } else if (bmNameLower.includes('hemoglobin') || bmNameLower.includes('hb')) {
          detectedType = 'HEMOGLOBIN'
        }

        const numVal = parseFloat(bm.value)
        if (detectedType && !isNaN(numVal)) {
          list.push({
            id: `lab-${rec.id}-${idx}`,
            date: recDate,
            timestamp: new Date(recDate).getTime(),
            vitalType: detectedType,
            name: bm.name,
            value: numVal,
            unit: bm.unit || '',
            context: `Lab: ${rec.title}`,
            status: bm.status || 'NORMAL',
            source: 'LAB_REPORT',
            notes: rec.hospital_clinic ? `Report from ${rec.hospital_clinic}` : undefined,
          })
        }
      })
    })

    return list.sort((a, b) => a.timestamp - b.timestamp)
  }, [vitalLogs, medicalRecords])

  // Filter for selected category
  const filteredPoints = useMemo(() => {
    return allDataPoints.filter(p => p.vitalType === selectedCategory)
  }, [allDataPoints, selectedCategory])

  // Summary Metrics
  const stats = useMemo(() => {
    if (filteredPoints.length === 0) return null

    const values = filteredPoints.map(p => p.value)
    const latest = filteredPoints[filteredPoints.length - 1]
    const prev = filteredPoints.length > 1 ? filteredPoints[filteredPoints.length - 2] : null

    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length

    let delta = 0
    let deltaFormatted = ''
    if (prev) {
      delta = latest.value - prev.value
      deltaFormatted = delta > 0 ? `+${delta.toFixed(1)}` : `${delta.toFixed(1)}`
    }

    return {
      latest,
      prev,
      min,
      max,
      avg: avg.toFixed(1),
      delta,
      deltaFormatted,
      count: filteredPoints.length,
    }
  }, [filteredPoints])

  // Target ranges for reference lines
  const getReferenceRange = (cat: string) => {
    switch (cat) {
      case 'BLOOD_GLUCOSE':
        return { min: 70, max: 99, highLimit: 140, label: 'Normal Fasting Target: 70 - 99 mg/dL' }
      case 'HBA1C':
        return { min: 4.0, max: 5.6, highLimit: 6.5, label: 'Normal Target: < 5.7%' }
      case 'BLOOD_PRESSURE':
        return { min: 90, max: 120, highLimit: 140, label: 'Optimal Systolic: 90 - 120 mmHg' }
      case 'HEART_RATE':
        return { min: 60, max: 100, highLimit: 110, label: 'Normal Resting: 60 - 100 bpm' }
      case 'SPO2':
        return { min: 95, max: 100, highLimit: 100, label: 'Normal Oxygen: 95 - 100%' }
      default:
        return null
    }
  }

  const refRange = getReferenceRange(selectedCategory)

  // Chart SVG bounds calculation
  const chartHeight = 240
  const chartWidth = 650
  const padding = { top: 30, right: 30, bottom: 40, left: 45 }

  const chartScale = useMemo(() => {
    if (filteredPoints.length === 0) return null

    let minVal = Math.min(...filteredPoints.map(p => p.value))
    let maxVal = Math.max(...filteredPoints.map(p => p.value))

    // Include secondary value (e.g. Diastolic BP) in bounds if available
    filteredPoints.forEach(p => {
      if (p.valueSecondary !== undefined) {
        minVal = Math.min(minVal, p.valueSecondary)
        maxVal = Math.max(maxVal, p.valueSecondary)
      }
    })

    if (refRange) {
      minVal = Math.min(minVal, refRange.min - 10)
      maxVal = Math.max(maxVal, refRange.max + 10)
    }

    const valueRange = maxVal - minVal || 1
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom

    const getX = (index: number) => {
      if (filteredPoints.length === 1) return padding.left + innerWidth / 2
      return padding.left + (index / (filteredPoints.length - 1)) * innerWidth
    }

    const getY = (val: number) => {
      return padding.top + innerHeight - ((val - minVal) / valueRange) * innerHeight
    }

    return { minVal, maxVal, getX, getY }
  }, [filteredPoints, refRange])

  // SVG Path generation
  const linePath = useMemo(() => {
    if (!chartScale || filteredPoints.length === 0) return ''
    return filteredPoints.reduce((acc, point, index) => {
      const x = chartScale.getX(index)
      const y = chartScale.getY(point.value)
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }, '')
  }, [filteredPoints, chartScale])

  // Secondary line path for Blood Pressure Diastolic
  const secondaryLinePath = useMemo(() => {
    if (!chartScale || selectedCategory !== 'BLOOD_PRESSURE') return ''
    const pointsWithSecondary = filteredPoints.filter(p => p.valueSecondary !== undefined)
    if (pointsWithSecondary.length === 0) return ''

    return filteredPoints.reduce((acc, point, index) => {
      if (point.valueSecondary === undefined) return acc
      const x = chartScale.getX(index)
      const y = chartScale.getY(point.valueSecondary)
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }, '')
  }, [filteredPoints, chartScale, selectedCategory])

  const handleDeleteVital = async (id: string) => {
    if (id.startsWith('lab-')) {
      alert('This measurement was extracted from a Lab Report document. You can manage or delete the parent report under the Lab Reports tab.')
      return
    }
    if (!confirm('Are you sure you want to delete this vital log entry?')) return

    setIsDeletingId(id)
    try {
      const res = await deleteVitalLog(id, familyMemberId)
      if (res.success) {
        router.refresh()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeletingId(null)
    }
  }

  const categoryOptions = [
    { value: 'BLOOD_GLUCOSE', label: 'Blood Glucose', icon: Droplet, unit: 'mg/dL' },
    { value: 'BLOOD_PRESSURE', label: 'Blood Pressure', icon: Heart, unit: 'mmHg' },
    { value: 'HBA1C', label: 'HbA1c', icon: Percent, unit: '%' },
    { value: 'HEART_RATE', label: 'Pulse / Heart Rate', icon: Activity, unit: 'bpm' },
    { value: 'SPO2', label: 'Oxygen Saturation', icon: Wind, unit: '%' },
    { value: 'WEIGHT', label: 'Body Weight', icon: Weight, unit: 'kg' },
    { value: 'CHOLESTEROL', label: 'Lipid / Cholesterol', icon: Activity, unit: 'mg/dL' },
  ]

  const currentCategoryObj = categoryOptions.find(c => c.value === selectedCategory) || categoryOptions[0]

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#2F4858]/15 shadow-sm">
        <div>
          <h2 className="text-sm sm:text-base font-black text-[#2F4858] flex items-center gap-2">
            <Activity className="size-4 sm:size-5 text-[#2F4858]" />
            <span>Health Vitals & Biomarker Trends</span>
          </h2>
          <p className="text-xs font-semibold text-[#2F4858]/70 mt-0.5">
            Track daily at-home blood glucose, BP, pulse, and lab-extracted diagnostic parameters over time.
          </p>
        </div>
        <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
          <LogVitalModal
            familyMemberId={familyMemberId}
            familyMemberName={familyMemberName}
            defaultType={selectedCategory}
          />
        </div>
      </div>

      {/* Parameter Selection Pills (Swipeable on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
        {categoryOptions.map((opt) => {
          const Icon = opt.icon
          const isSelected = selectedCategory === opt.value
          const count = allDataPoints.filter(p => p.vitalType === opt.value).length
          return (
            <button
              key={opt.value}
              onClick={() => setSelectedCategory(opt.value)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#2F4858] text-[#DDFBEF] shadow-sm scale-[1.02]'
                  : 'bg-white text-[#2F4858] border border-[#2F4858]/15 hover:border-[#2F4858]/40 hover:bg-[#DDFBEF]/30'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{opt.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-[#DDFBEF] text-[#2F4858]' : 'bg-[#DDFBEF]/60 text-[#2F4858]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Metrics Summary Cards */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Latest Card */}
          <Card className="bg-white border-[#2F4858]/15 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">
              Latest Reading
            </span>
            <div className="pt-2">
              <div className="text-xl sm:text-2xl font-black text-[#2F4858] tabular-nums flex items-baseline gap-1">
                {stats.latest.value}
                {stats.latest.valueSecondary !== undefined && ` / ${stats.latest.valueSecondary}`}
                <span className="text-xs font-bold text-[#2F4858]/60">{stats.latest.unit}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] font-semibold text-[#2F4858]/70 truncate">
                <Calendar className="size-3 shrink-0" />
                <span>{new Date(stats.latest.date).toLocaleDateString()}</span>
                <span>• {stats.latest.context}</span>
              </div>
            </div>
          </Card>

          {/* Delta vs Previous */}
          <Card className="bg-white border-[#2F4858]/15 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">
              Change vs Previous
            </span>
            <div className="pt-2">
              {stats.prev ? (
                <div>
                  <div className={`text-xl sm:text-2xl font-black tabular-nums flex items-center gap-1.5 ${
                    stats.delta > 0
                      ? selectedCategory === 'SPO2' ? 'text-emerald-700' : 'text-rose-700'
                      : stats.delta < 0
                      ? selectedCategory === 'SPO2' ? 'text-rose-700' : 'text-emerald-700'
                      : 'text-[#2F4858]'
                  }`}>
                    {stats.delta > 0 ? <TrendingUp className="size-4 sm:size-5" /> : stats.delta < 0 ? <TrendingDown className="size-4 sm:size-5" /> : <Minus className="size-4 sm:size-5" />}
                    <span>{stats.deltaFormatted} {stats.latest.unit}</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#2F4858]/70 mt-1 truncate">
                    Prev: {stats.prev.value} ({new Date(stats.prev.date).toLocaleDateString()})
                  </p>
                </div>
              ) : (
                <div className="text-xs font-bold text-[#2F4858]/60 pt-1">
                  Single reading recorded
                </div>
              )}
            </div>
          </Card>

          {/* Average */}
          <Card className="bg-white border-[#2F4858]/15 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">
              Period Average
            </span>
            <div className="pt-2">
              <div className="text-xl sm:text-2xl font-black text-[#2F4858] tabular-nums">
                {stats.avg} <span className="text-xs font-bold text-[#2F4858]/60">{stats.latest.unit}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#2F4858]/70 mt-1 truncate">
                Across {stats.count} total checks
              </p>
            </div>
          </Card>

          {/* Min / Max Range */}
          <Card className="bg-white border-[#2F4858]/15 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">
              Min / Max Range
            </span>
            <div className="pt-2">
              <div className="text-base sm:text-lg font-black text-[#2F4858] tabular-nums">
                {stats.min} – {stats.max} <span className="text-xs font-bold text-[#2F4858]/60">{stats.latest.unit}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#2F4858]/70 mt-1 truncate">
                Lowest & Highest recorded
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Main Interactive Chart Canvas */}
      <Card className="bg-white border-[#2F4858]/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#2F4858]/10">
          <div>
            <h3 className="font-extrabold text-sm text-[#2F4858] flex items-center gap-2">
              <span>{currentCategoryObj.label} Trend Curve</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                {currentCategoryObj.unit}
              </Badge>
            </h3>
            {refRange && (
              <p className="text-xs font-semibold text-[#2F4858]/70 mt-0.5">
                {refRange.label}
              </p>
            )}
          </div>
        </div>

        {filteredPoints.length === 0 ? (
          <div className="text-center py-16">
            <div className="size-12 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center mx-auto mb-3">
              <Activity className="size-6 opacity-70" />
            </div>
            <h4 className="font-bold text-sm text-[#2F4858]">No readings recorded for {currentCategoryObj.label}</h4>
            <p className="text-xs text-[#2F4858]/70 max-w-sm mx-auto mt-1 mb-4 font-medium">
              Log an at-home reading or upload a lab report to start tracking your health trends.
            </p>
            <div className="inline-flex">
              <LogVitalModal
                familyMemberId={familyMemberId}
                familyMemberName={familyMemberName}
                defaultType={selectedCategory}
              />
            </div>
          </div>
        ) : (
          <div className="pt-4 overflow-x-auto">
            <div className="min-w-[600px] relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = padding.top + (chartHeight - padding.top - padding.bottom) * pct
                  const val = chartScale ? Math.round(chartScale.maxVal - pct * (chartScale.maxVal - chartScale.minVal)) : 0
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke="#2F4858"
                        strokeOpacity="0.08"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        fontSize="9"
                        fontWeight="bold"
                        fill="#2F4858"
                        opacity="0.6"
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* Normal Reference Range Band if available */}
                {refRange && chartScale && (
                  <rect
                    x={padding.left}
                    y={Math.max(padding.top, chartScale.getY(refRange.max))}
                    width={chartWidth - padding.left - padding.right}
                    height={Math.max(0, chartScale.getY(refRange.min) - chartScale.getY(refRange.max))}
                    fill="#B7EED8"
                    fillOpacity="0.25"
                    rx="4"
                  />
                )}

                {/* Main Trend Line Path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2F4858"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Secondary Line for Diastolic BP */}
                {secondaryLinePath && (
                  <path
                    d={secondaryLinePath}
                    fill="none"
                    stroke="#F4B266"
                    strokeWidth="2.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Data Points & Dots */}
                {filteredPoints.map((point, idx) => {
                  if (!chartScale) return null
                  const cx = chartScale.getX(idx)
                  const cy = chartScale.getY(point.value)
                  const isHovered = hoveredPoint?.id === point.id
                  const isHigh = point.status === 'HIGH' || point.status === 'CRITICAL'
                  const isLow = point.status === 'LOW'

                  const dotColor = isHigh ? '#E11D48' : isLow ? '#F59E0B' : '#059669'

                  return (
                    <g key={point.id} className="cursor-pointer">
                      {/* Pulse ring on hover or alert */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 10 : 7}
                        fill={dotColor}
                        fillOpacity={isHovered ? 0.3 : 0.15}
                        className="transition-all"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 6 : 4.5}
                        fill={dotColor}
                        stroke="#ffffff"
                        strokeWidth="2"
                        onMouseEnter={() => setHoveredPoint(point)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* X-axis date labels */}
                      <text
                        x={cx}
                        y={chartHeight - 12}
                        fontSize="9"
                        fontWeight="bold"
                        fill="#2F4858"
                        opacity="0.7"
                        textAnchor="middle"
                      >
                        {new Date(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Hover / Active Reading Tooltip Banner */}
        {hoveredPoint && (
          <div className="mt-4 p-3 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/15 flex items-center justify-between gap-3 text-xs animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#2F4858]" />
              <span className="font-bold text-[#2F4858]">
                {new Date(hoveredPoint.date).toLocaleDateString()} ({hoveredPoint.context}):
              </span>
              <span className="font-black text-[#2F4858] text-sm">
                {hoveredPoint.value} {hoveredPoint.valueSecondary !== undefined && `/ ${hoveredPoint.valueSecondary}`} {hoveredPoint.unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`text-[10px] font-black ${
                  hoveredPoint.status === 'HIGH' || hoveredPoint.status === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : hoveredPoint.status === 'LOW'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {hoveredPoint.status}
              </Badge>
              {hoveredPoint.notes && (
                <span className="text-[#2F4858]/70 italic truncate max-w-xs">{hoveredPoint.notes}</span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Historical Table of Readings */}
      <Card className="bg-white border-[#2F4858]/15 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-[#2F4858] flex items-center gap-2">
            <span>Historical Log ({filteredPoints.length})</span>
          </h3>
        </div>

        {filteredPoints.length > 0 ? (
          <div className="border border-[#2F4858]/10 rounded-2xl overflow-x-auto shadow-xs">
            <table className="min-w-[620px] w-full text-left text-xs">
              <thead className="bg-[#F8FDFB] border-b border-[#2F4858]/10 text-[#2F4858]/70 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Date & Time</th>
                  <th className="py-3 px-3.5">Measurement</th>
                  <th className="py-3 px-3.5">Context / Timing</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Source & Notes</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F4858]/10 font-semibold">
                {filteredPoints.slice().reverse().map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FDFB]/60 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-[#2F4858] tabular-nums">
                      {new Date(item.date).toLocaleDateString()}{' '}
                      <span className="text-[10px] font-normal text-[#2F4858]/60">
                        {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-black text-sm text-[#2F4858] tabular-nums">
                      {item.value} {item.valueSecondary !== undefined && `/ ${item.valueSecondary}`}{' '}
                      <span className="text-[11px] font-medium text-[#2F4858]/70">{item.unit}</span>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-[#2F4858]">{item.context || '—'}</td>
                    <td className="py-3 px-3.5">
                      <Badge
                        className={`text-[10px] font-black ${
                          item.status === 'HIGH' || item.status === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : item.status === 'LOW'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3.5 text-xs text-[#2F4858]/80 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] font-bold bg-[#DDFBEF]/40 text-[#2F4858]">
                          {item.source === 'AT_HOME' ? 'Home Check' : 'Lab Document'}
                        </Badge>
                        {item.notes && <span className="truncate max-w-xs">{item.notes}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {item.source === 'AT_HOME' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={isDeletingId === item.id}
                          onClick={() => handleDeleteVital(item.id)}
                          className="text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : (
                        <span className="text-[10px] text-[#2F4858]/50 italic">Lab record</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs font-semibold text-[#2F4858]/60 text-center py-4">
            No readings recorded yet.
          </p>
        )}
      </Card>
    </div>
  )
}
