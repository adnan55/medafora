export interface AgeInfo {
  years: number
  months: number
  days: number
  formatted: string
  lifeStage: 'INFANT' | 'TODDLER' | 'CHILD' | 'TEEN' | 'ADULT' | 'SENIOR'
  lifeStageLabel: string
  isPediatric: boolean
  isGeriatric: boolean
  badgeColor: string
}

export function calculateAge(dobString?: string | null): AgeInfo | null {
  if (!dobString) return null

  const birthDate = new Date(dobString)
  if (isNaN(birthDate.getTime())) return null

  const today = new Date()
  
  let years = today.getFullYear() - birthDate.getFullYear()
  let months = today.getMonth() - birthDate.getMonth()
  let days = today.getDate() - birthDate.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    days += prevMonth.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years < 0) {
    return null // Future date
  }

  let formatted = ''
  let lifeStage: AgeInfo['lifeStage'] = 'ADULT'
  let lifeStageLabel = 'Adult'
  let isPediatric = false
  let isGeriatric = false
  let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200'

  if (years === 0) {
    isPediatric = true
    if (months === 0) {
      formatted = `${days} days`
      lifeStage = 'INFANT'
      lifeStageLabel = 'Newborn Infant'
      badgeColor = 'bg-purple-100 text-purple-800 border-purple-200'
    } else {
      formatted = `${months} mo${months > 1 ? 's' : ''}`
      lifeStage = 'INFANT'
      lifeStageLabel = 'Pediatric Infant'
      badgeColor = 'bg-purple-100 text-purple-800 border-purple-200'
    }
  } else if (years < 4) {
    isPediatric = true
    formatted = `${years} yr${years > 1 ? 's' : ''} ${months > 0 ? `${months}m` : ''}`.trim()
    lifeStage = 'TODDLER'
    lifeStageLabel = 'Pediatric Toddler'
    badgeColor = 'bg-pink-100 text-pink-800 border-pink-200'
  } else if (years < 13) {
    isPediatric = true
    formatted = `${years} yrs`
    lifeStage = 'CHILD'
    lifeStageLabel = 'Pediatric (Child)'
    badgeColor = 'bg-sky-100 text-sky-800 border-sky-200'
  } else if (years < 18) {
    isPediatric = true
    formatted = `${years} yrs`
    lifeStage = 'TEEN'
    lifeStageLabel = 'Pediatric (Teen)'
    badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200'
  } else if (years >= 65) {
    isGeriatric = true
    formatted = `${years} yrs`
    lifeStage = 'SENIOR'
    lifeStageLabel = 'Senior / Geriatric'
    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300'
  } else {
    formatted = `${years} yrs`
    lifeStage = 'ADULT'
    lifeStageLabel = 'Adult'
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
  }

  return {
    years,
    months,
    days,
    formatted,
    lifeStage,
    lifeStageLabel,
    isPediatric,
    isGeriatric,
    badgeColor,
  }
}

/**
 * Checks if a medicine has potential age-specific clinical considerations
 */
export function checkAgeSpecificMedicineAlerts(
  medicineName: string,
  saltComposition: string | undefined,
  ageInfo: AgeInfo | null
): { hasWarning: boolean; warningType?: string; message?: string } {
  if (!ageInfo) return { hasWarning: false }

  const text = `${medicineName} ${saltComposition || ''}`.toLowerCase()

  // Pediatric Alerts (< 18 yrs)
  if (ageInfo.isPediatric) {
    if (text.includes('aspirin') || text.includes('acetylsalicylic')) {
      return {
        hasWarning: true,
        warningType: 'PEDIATRIC_REYES_RISK',
        message: `⚠️ Pediatric Caution (${ageInfo.formatted}): Aspirin is strictly contraindicated in children/teens with viral fever due to Reye's syndrome risk. Consult pediatrician.`,
      }
    }

    if (ageInfo.years < 8 && (text.includes('doxycycline') || text.includes('tetracycline'))) {
      return {
        hasWarning: true,
        warningType: 'PEDIATRIC_DENTAL_RISK',
        message: `⚠️ Pediatric Caution (${ageInfo.formatted}): Tetracyclines may cause permanent tooth discoloration in children under 8 years.`,
      }
    }

    if (text.includes('ciprofloxacin') || text.includes('levofloxacin') || text.includes('ofloxacin')) {
      return {
        hasWarning: true,
        warningType: 'PEDIATRIC_CARTILAGE_WATCH',
        message: `ℹ️ Pediatric Notice (${ageInfo.formatted}): Fluoroquinolones require strict weight-based pediatric dosing.`,
      }
    }
  }

  // Geriatric Alerts (>= 65 yrs)
  if (ageInfo.isGeriatric) {
    if (text.includes('alprazolam') || text.includes('clonazepam') || text.includes('diazepam') || text.includes('lorazepam')) {
      return {
        hasWarning: true,
        warningType: 'GERIATRIC_FALL_RISK',
        message: `⚠️ Geriatric Alert (${ageInfo.formatted}): Sedative medication increases drowsiness and fall risk in seniors (Beers Criteria).`,
      }
    }

    if (text.includes('diclofenac') || text.includes('ketorolac') || text.includes('piroxicam')) {
      return {
        hasWarning: true,
        warningType: 'GERIATRIC_NSAID_RISK',
        message: `ℹ️ Geriatric Watch (${ageInfo.formatted}): Strong NSAIDs warrant kidney and GI stomach protection in seniors over 65.`,
      }
    }
  }

  return { hasWarning: false }
}
