import { Agent, App } from '@google/adk'
import { medicineVisionAgent } from './agents/medicineVisionAgent'
import { diagnosticReportAgent } from './agents/diagnosticReportAgent'
import { familyHealthGuardianAgent } from './agents/familyHealthGuardianAgent'
import { regulatorySafetyAgent } from './agents/regulatorySafetyAgent'

import { parseMedicinePackagingTool, checkDrugSaltIndicationsTool } from './tools/medicineVisionTools'
import { evaluateBiomarkerRangeTool } from './tools/diagnosticTools'
import { calculatePatientAgeAndLifeStageTool, checkDrugSafetyAndAllergiesTool } from './tools/patientHealthTools'
import { queryBannedDrugsListTool } from './tools/safetyScanTools'
import { fetchMedicineCabinetTool, fetchPatientClinicalHistoryTool } from './tools/databaseTools'
import { recordClinicalMemoryTool, recallPatientMemoriesTool, LOAD_MEMORY } from './tools/clinicalMemoryTools'

/**
 * Medafora Master AI Orchestrator Agent
 * Hierarchical root agent coordinating all clinical intelligence, vision, safety, and Supabase memory services.
 */
export const rootAgent = new Agent({
  name: 'MedaforaOrchestratorAgent',
  description: 'Master clinical intelligence orchestrator for Medafora Family Medicine & Health Guardian with continuous Supabase patient memory.',
  model: 'gemini-3.7-flash',
  instruction: `You are the Master Clinical Intelligence Orchestrator for Medafora (Family Medicine, Safety & AI Health Guardian).
You coordinate specialized AI sub-agents with continuous patient memory stored in Supabase:

1. 🧠 Longitudinal Patient Memory & Continuity of Care:
   - Always check past patient diagnostic issues, abnormal lab trends, reasons for past symptoms, and adverse medication reactions using recall_patient_memories tool.
   - Store significant new findings, biomarker anomalies, and doctor directives using record_clinical_memory tool.

2. 🔬 Diagnostic Lab Reports & Biomarkers:
   - For blood tests, pathology documents, metabolic panels (CMP/CBC/Lipids), and biomarker status evaluation, delegate to DiagnosticReportAgent.

3. 🛡️ Family Health Synthesis & Patient Consultations:
   - For age-specific safety (pediatric dosing vs geriatric Beers criteria), allergy conflict checks, and longitudinal vitals tracking, delegate to FamilyHealthGuardianAgent.

4. 📸 Medicine Vision & Recognition:
   - For medicine packaging, multi-image blister pack scans, expiry dates, and dosage forms, delegate to MedicineVisionAgent.

5. 🚨 Regulatory Safety & Pharmacovigilance:
   - For banned Fixed-Dose Combinations (FDCs), CDSCO gazette notices, drug recalls, and hazardous combinations, delegate to RegulatorySafetyAgent.

Always prioritize patient safety, explain complex pharmaceutical terms in accessible language, and provide actionable physician consultation guidance.`,
  tools: [
    recordClinicalMemoryTool,
    recallPatientMemoriesTool,
    LOAD_MEMORY,
    parseMedicinePackagingTool,
    checkDrugSaltIndicationsTool,
    evaluateBiomarkerRangeTool,
    calculatePatientAgeAndLifeStageTool,
    checkDrugSafetyAndAllergiesTool,
    queryBannedDrugsListTool,
    fetchMedicineCabinetTool,
    fetchPatientClinicalHistoryTool,
  ],
  subAgents: [
    familyHealthGuardianAgent,
    diagnosticReportAgent,
    medicineVisionAgent,
    regulatorySafetyAgent,
  ],
})

export const app = new App({
  name: 'MedaforaApp',
  rootAgent: rootAgent,
})

export default rootAgent
