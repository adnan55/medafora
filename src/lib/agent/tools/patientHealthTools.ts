import { FunctionTool } from '@google/adk'
import { z } from 'zod'

/**
 * Tool: Calculate Dynamic Age & Life-Stage Precautions
 */
export const calculatePatientAgeAndLifeStageTool = new FunctionTool({
  name: 'calculate_patient_age_and_lifestage',
  description: 'Calculates the exact chronological age, pediatric/geriatric category, and developmental precautions from a birthdate.',
  parameters: z.object({
    date_of_birth: z.string().describe('ISO format birthdate YYYY-MM-DD'),
  }) as any,
  execute: async (input: any) => {
    const { date_of_birth = '' } = input || {}
    const dob = new Date(date_of_birth)
    if (isNaN(dob.getTime())) {
      return { error: 'Invalid date format' }
    }

    const today = new Date()
    let years = today.getFullYear() - dob.getFullYear()
    let months = today.getMonth() - dob.getMonth()
    let days = today.getDate() - dob.getDate()

    if (days < 0) {
      months -= 1
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      days += prevMonth.getDate()
    }
    if (months < 0) {
      years -= 1
      months += 12
    }

    let lifeStage = 'ADULT'
    let formatted = `${years} yrs`
    let isPediatric = false
    let isGeriatric = false

    if (years === 0) {
      isPediatric = true
      lifeStage = months === 0 ? 'NEWBORN_INFANT' : 'PEDIATRIC_INFANT'
      formatted = months === 0 ? `${days} days` : `${months} mos`
    } else if (years < 4) {
      isPediatric = true
      lifeStage = 'PEDIATRIC_TODDLER'
      formatted = `${years} yrs ${months > 0 ? `${months}m` : ''}`.trim()
    } else if (years < 13) {
      isPediatric = true
      lifeStage = 'PEDIATRIC_CHILD'
      formatted = `${years} yrs`
    } else if (years < 18) {
      isPediatric = true
      lifeStage = 'PEDIATRIC_TEEN'
      formatted = `${years} yrs`
    } else if (years >= 65) {
      isGeriatric = true
      lifeStage = 'SENIOR_GERIATRIC'
      formatted = `${years} yrs`
    }

    return {
      age_years: years,
      age_months: months,
      age_formatted: formatted,
      life_stage: lifeStage,
      is_pediatric: isPediatric,
      is_geriatric: isGeriatric,
      clinical_guidance: isPediatric
        ? 'Pediatric patient: Dosages MUST be scaled by body weight (mg/kg). Check for contraindications like Aspirin (Reye syndrome) or adult NSAIDs.'
        : isGeriatric
        ? 'Geriatric patient: Assess renal/hepatic clearance, fall risk with sedatives, and monitor for polypharmacy interactions (Beers Criteria).'
        : 'Adult patient: Standard adult dosing applies.',
    }
  },
})

/**
 * Tool: Cross-Check Drug-Allergy & Interaction Safety
 */
export const checkDrugSafetyAndAllergiesTool = new FunctionTool({
  name: 'check_drug_safety_and_allergies',
  description: 'Audits medicine ingredients against recorded patient allergies, age group, and existing medications for safety conflicts.',
  parameters: z.object({
    medicine_name: z.string().describe('Target medicine name and active salts'),
    patient_allergies: z.array(z.string()).describe('List of known drug or food allergies'),
    patient_age: z.number().optional().describe('Patient age in years'),
    active_medicines: z.array(z.string()).optional().describe('List of currently active cabinet medicines'),
  }) as any,
  execute: async (input: any) => {
    const {
      medicine_name = '',
      patient_allergies = [],
      patient_age,
      active_medicines = [],
    } = input || {}

    const medLower = String(medicine_name).toLowerCase()
    const conflicts: string[] = []
    const warnings: string[] = []

    // Allergy check
    if (Array.isArray(patient_allergies)) {
      patient_allergies.forEach((allergy: string) => {
        if (allergy && medLower.includes(String(allergy).toLowerCase())) {
          conflicts.push(`CRITICAL ALLERGY: "${allergy}" matches target medicine "${medicine_name}".`)
        }
      })
    }

    // Pediatric Aspirin / Reye's check
    if (patient_age !== undefined && Number(patient_age) < 18) {
      if (medLower.includes('aspirin') || medLower.includes('acetylsalicylic')) {
        conflicts.push(`PEDIATRIC WARNING: Aspirin is strictly contraindicated under 18 due to Reye's syndrome risk in viral fever.`)
      }
      if (Number(patient_age) < 8 && (medLower.includes('doxycycline') || medLower.includes('tetracycline'))) {
        warnings.push(`PEDIATRIC DENTAL: Tetracyclines may cause permanent tooth enamel discoloration under 8 years.`)
      }
    }

    // Duplicate therapy check
    if (Array.isArray(active_medicines) && active_medicines.length > 0) {
      if (medLower.includes('paracetamol') || medLower.includes('acetaminophen')) {
        const otherAcetaminophen = active_medicines.find(
          (m: string) =>
            (String(m).toLowerCase().includes('paracetamol') ||
              String(m).toLowerCase().includes('dolo') ||
              String(m).toLowerCase().includes('crocin') ||
              String(m).toLowerCase().includes('calpol')) &&
            !String(m).toLowerCase().includes(medLower)
        )
        if (otherAcetaminophen) {
          warnings.push(
            `DUPLICATE THERAPY: Patient is already taking "${otherAcetaminophen}". Combining multiple Paracetamol products increases hepatotoxicity risk.`
          )
        }
      }
    }

    return {
      safety_cleared: conflicts.length === 0,
      critical_conflicts: conflicts,
      clinical_warnings: warnings,
      overall_risk: conflicts.length > 0 ? 'HIGH_RISK' : warnings.length > 0 ? 'MODERATE_CAUTION' : 'CLEARED_SAFE',
    }
  },
})
