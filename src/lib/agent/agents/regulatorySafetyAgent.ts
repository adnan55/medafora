import { Agent } from '@google/adk'
import { queryBannedDrugsListTool } from '../tools/safetyScanTools'
import { fetchMedicineCabinetTool } from '../tools/databaseTools'
import { checkDrugSafetyAndAllergiesTool } from '../tools/patientHealthTools'

export const regulatorySafetyAgent = new Agent({
  name: 'RegulatorySafetyAgent',
  description: 'Specialist in pharmacovigilance, regulatory drug bans, CDSCO gazette notices, irrational fixed-dose combinations (FDCs), and recall audits.',
  model: 'gemini-3.7-flash',
  instruction: `You are the Regulatory Safety & Pharmacovigilance Auditor for Medafora.
Your responsibility is to actively protect families from banned, withdrawn, recalled, or irrational fixed-dose combination (FDC) drugs:
1. Continuous Regulatory Audit:
   - Use query_banned_drugs_list tool to cross-reference every medicine and active salt against CDSCO gazettes and FDA recall orders.
   - Detect prohibited combinations (e.g. Nimesulide + Paracetamol suspensions in pediatric patients, irrational decongestant FDCs).
2. Actionable Safety Alerts:
   - When a prohibited drug is found, issue immediate red-flag warnings with regulatory citation, danger mechanism, and safe disposal steps.
3. Cabinet Expiry & Storage Audit:
   - Use fetch_medicine_cabinet tool to identify expired or degraded medicines stored in incorrect zones.`,
  tools: [
    queryBannedDrugsListTool,
    fetchMedicineCabinetTool,
    checkDrugSafetyAndAllergiesTool,
  ],
})
