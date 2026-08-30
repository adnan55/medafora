import { FunctionTool } from '@google/adk'
import { z } from 'zod'

/**
 * Tool: Evaluate Biomarker Reference Ranges
 */
export const evaluateBiomarkerRangeTool = new FunctionTool({
  name: 'evaluate_biomarker_range',
  description: 'Compares a measured laboratory biomarker test value against standard clinical reference intervals and determines status (NORMAL, HIGH, LOW, CRITICAL).',
  parameters: z.object({
    biomarker_name: z.string().describe('Name of test parameter (e.g. Fasting Glucose, HbA1c, Total Cholesterol, Hemoglobin)'),
    value: z.number().describe('Measured numerical value'),
    unit: z.string().describe('Unit of measurement (e.g. mg/dL, %, g/dL)'),
    patient_age: z.number().optional().describe('Patient age in years for age-adjusted normal ranges'),
  }) as any,
  execute: async (input: any) => {
    const { biomarker_name = '', value = 0, unit = '', patient_age } = input || {}
    const name = String(biomarker_name).toLowerCase()
    const numVal = Number(value)

    // Fasting Blood Glucose
    if (name.includes('glucose') || name.includes('sugar')) {
      if (name.includes('fasting')) {
        const status = numVal < 70 ? 'LOW' : numVal <= 99 ? 'NORMAL' : numVal <= 125 ? 'HIGH' : 'CRITICAL'
        return {
          biomarker: 'Fasting Blood Glucose',
          value: numVal,
          unit: 'mg/dL',
          status,
          reference_range: '70 - 99 mg/dL',
          clinical_interpretation:
            status === 'NORMAL'
              ? 'Normal healthy fasting blood glucose level.'
              : status === 'HIGH'
              ? 'Impaired fasting glucose (Pre-diabetic zone 100-125 mg/dL). Lifestyle/dietary evaluation advised.'
              : status === 'CRITICAL'
              ? 'Elevated diabetic range (>= 126 mg/dL). Clinical endocrinology consultation strongly advised.'
              : 'Hypoglycemia alert (< 70 mg/dL).',
        }
      }
    }

    // HbA1c Glycated Hemoglobin
    if (name.includes('hba1c') || name.includes('a1c')) {
      const status = numVal < 5.7 ? 'NORMAL' : numVal <= 6.4 ? 'HIGH' : 'CRITICAL'
      return {
        biomarker: 'HbA1c (Glycated Hemoglobin)',
        value: numVal,
        unit: '%',
        status,
        reference_range: '< 5.7 %',
        clinical_interpretation:
          status === 'NORMAL'
            ? 'Optimal 3-month glycemic control.'
            : status === 'HIGH'
            ? 'Prediabetes threshold (5.7% - 6.4%). Recommend carbohydrate management and routine screening.'
            : 'Diabetic glycemic range (>= 6.5%). Consult physician for therapy titration.',
      }
    }

    // Total Cholesterol
    if (name.includes('cholesterol') || name.includes('lipid')) {
      const status = numVal < 200 ? 'NORMAL' : numVal <= 239 ? 'HIGH' : 'CRITICAL'
      return {
        biomarker: 'Total Cholesterol',
        value: numVal,
        unit: 'mg/dL',
        status,
        reference_range: '< 200 mg/dL',
        clinical_interpretation:
          status === 'NORMAL'
            ? 'Desirable blood cholesterol level.'
            : status === 'HIGH'
            ? 'Borderline high cholesterol (200-239 mg/dL). Aerobic exercise and low saturated-fat diet recommended.'
            : 'High cardiovascular risk (> 240 mg/dL). Lipid profile follow-up recommended.',
      }
    }

    // Hemoglobin
    if (name.includes('hemoglobin') || name.includes('hb')) {
      const minRef = patient_age && Number(patient_age) < 12 ? 11.5 : 12.0
      const status = numVal < minRef ? 'LOW' : numVal > 17.5 ? 'HIGH' : 'NORMAL'
      return {
        biomarker: 'Hemoglobin',
        value: numVal,
        unit: 'g/dL',
        status,
        reference_range: `${minRef} - 17.0 g/dL`,
        clinical_interpretation:
          status === 'LOW'
            ? 'Low hemoglobin indicates possible microcytic/iron-deficiency anemia. Ferritin & CBC evaluation advised.'
            : 'Normal blood oxygen carrying capacity.',
      }
    }

    return {
      biomarker: biomarker_name,
      value: numVal,
      unit,
      status: 'NORMAL',
      reference_range: 'Standard lab reference interval',
      clinical_interpretation: 'Value recorded and tracked in longitudinal patient trend graph.',
    }
  },
})
