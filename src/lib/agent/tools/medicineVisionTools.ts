import { FunctionTool } from '@google/adk'
import { z } from 'zod'

/**
 * Tool: Parse Medicine Packaging & Multi-Photo Vision Text
 */
export const parseMedicinePackagingTool = new FunctionTool({
  name: 'parse_medicine_packaging',
  description: 'Parses optical OCR text and labels from medicine boxes, blister strips front/back, or bottles to extract pharmaceutical properties.',
  parameters: z.object({
    raw_ocr_text: z.string().describe('Extracted text or description from the medicine photos'),
    photo_count: z.number().optional().describe('Number of photos analyzed'),
  }) as any,
  execute: async (input: any) => {
    const { raw_ocr_text = '', photo_count = 1 } = input || {}
    const text = String(raw_ocr_text).toLowerCase()

    const isTablet = text.includes('tablet') || text.includes('tab')
    const isCapsule = text.includes('capsule') || text.includes('cap')
    const isSyrup = text.includes('syrup') || text.includes('suspension') || text.includes('liquid') || text.includes('ml')
    const isOintment = text.includes('ointment') || text.includes('cream') || text.includes('gel')
    const isDrops = text.includes('drop') || text.includes('eye drop') || text.includes('ear drop')

    const dosageForm = isTablet
      ? 'TABLET'
      : isCapsule
      ? 'CAPSULE'
      : isSyrup
      ? 'SYRUP'
      : isOintment
      ? 'OINTMENT'
      : isDrops
      ? 'DROPS'
      : 'TABLET'

    const expMatch = String(raw_ocr_text).match(/(?:exp|expiry|exp\.|use before)[\s:]*([0-9]{2}[\/\-][0-9]{2,4}|[a-zA-Z]{3}[\s\-][0-9]{2,4})/i)
    const expiryFound = expMatch ? expMatch[1] : null

    const batchMatch = String(raw_ocr_text).match(/(?:b\.no|batch|lot|b\.no\.|batch no)[\s:]*([a-zA-Z0-9\-]+)/i)
    const batchFound = batchMatch ? batchMatch[1] : null

    return {
      status: 'PARSED_SUCCESS',
      photos_processed: photo_count,
      inferred_dosage_form: dosageForm,
      detected_expiry_hint: expiryFound,
      detected_batch_hint: batchFound,
      recommendation: 'Verify extracted dosage strength and active salts against clinical drug index.',
    }
  },
})

/**
 * Tool: Check Drug Salt Indications & Recommended Storage
 */
export const checkDrugSaltIndicationsTool = new FunctionTool({
  name: 'check_drug_salt_indications',
  description: 'Looks up indications, primary therapeutic uses, standard administration, and storage specifications for an active salt.',
  parameters: z.object({
    salt_name: z.string().describe('Active pharmaceutical ingredient (e.g. Paracetamol, Amoxicillin, Pantoprazole)'),
  }) as any,
  execute: async (input: any) => {
    const { salt_name = '' } = input || {}
    const s = String(salt_name).toLowerCase()

    if (s.includes('paracetamol') || s.includes('acetaminophen')) {
      return {
        salt: 'Paracetamol / Acetaminophen',
        category: 'Analgesic & Antipyretic',
        indications: 'Relief of mild to moderate pain (headache, body ache, toothache) and fever reduction.',
        standard_dosage: '500mg to 650mg every 4-6 hours after food. Max 4000mg/24h in adults.',
        storage: 'Store below 30°C in a dry place away from direct sunlight.',
        precautions: 'Do not exceed 4g daily to avoid hepatic liver toxicity. Avoid alcohol.',
      }
    }

    if (s.includes('amoxicillin') || s.includes('clavulanic') || s.includes('augmentin')) {
      return {
        salt: 'Amoxicillin + Potassium Clavulanate',
        category: 'Beta-lactam Antibiotic + Beta-lactamase Inhibitor',
        indications: 'Treatment of bacterial respiratory tract, ear, sinus, skin, and urinary tract infections.',
        standard_dosage: '625mg twice daily after meals for 5-7 days as prescribed by physician.',
        storage: 'Store in cool, dry place below 25°C. For oral suspension, keep refrigerated (2-8°C) after reconstitution.',
        precautions: 'Complete full prescribed antibiotic course. Strictly contraindicated in penicillin-allergic patients.',
      }
    }

    if (s.includes('pantoprazole') || s.includes('omeprazole') || s.includes('rabeprazole')) {
      return {
        salt: 'Proton Pump Inhibitor (PPI)',
        category: 'Gastrointestinal Acid Reducer',
        indications: 'Treatment of gastroesophageal reflux disease (GERD), acidity, heartburn, and peptic ulcers.',
        standard_dosage: '20mg to 40mg once daily in the morning 30-60 minutes before breakfast.',
        storage: 'Store in a moisture-proof container at room temperature.',
        precautions: 'Swallow whole, do not crush or chew enteric-coated tablets.',
      }
    }

    if (s.includes('cetirizine') || s.includes('fexofenadine') || s.includes('levocetirizine') || s.includes('loratadine')) {
      return {
        salt: 'Antihistamine / Anti-allergic',
        category: 'H1 Receptor Antagonist',
        indications: 'Relief of allergic rhinitis, runny nose, sneezing, itchy eyes, hives, and skin allergies.',
        standard_dosage: '5mg to 10mg once daily, preferably in the evening.',
        storage: 'Store below 30°C in cool and dry place.',
        precautions: 'May cause mild drowsiness. Avoid operating heavy machinery or alcohol.',
      }
    }

    return {
      salt: salt_name,
      category: 'Therapeutic Pharmaceutical Ingredient',
      indications: `Symptomatic treatment and management under clinical prescription.`,
      standard_dosage: 'Administer strictly as directed by the treating physician.',
      storage: 'Store in cool, dry place below 30°C away from moisture.',
      precautions: 'Review patient medical history and allergy profile before administration.',
    }
  },
})
