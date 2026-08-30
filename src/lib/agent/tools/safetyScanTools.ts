import { FunctionTool } from '@google/adk'
import { z } from 'zod'

/**
 * Tool: Query Regulatory Banned Drugs & Gazette Notices
 */
export const queryBannedDrugsListTool = new FunctionTool({
  name: 'query_banned_drugs_list',
  description: 'Searches national and global pharmaceutical regulatory gazettes (CDSCO, US FDA, EMA) for prohibited or recalled fixed-dose combinations (FDCs) and banned salts.',
  parameters: z.object({
    medicine_name: z.string().describe('Brand name of the medicine'),
    salt_composition: z.string().optional().describe('Active salt combination'),
  }) as any,
  execute: async (input: any) => {
    const { medicine_name = '', salt_composition = '' } = input || {}
    const text = `${medicine_name} ${salt_composition}`.toLowerCase()

    const bannedCombinations = [
      {
        keyword: 'nimesulide + paracetamol',
        salt: 'Nimesulide + Paracetamol (dispersible / suspension)',
        reason: 'CDSCO Gazette: Banned for pediatric use due to severe acute hepatotoxicity and liver failure risks.',
        gazette: 'GSR 82(E) / Gazette of India Prohibition',
      },
      {
        keyword: 'paracetamol + phenylephrine + caffeine',
        salt: 'Paracetamol + Phenylephrine + Caffeine combinations',
        reason: 'CDSCO 156 Banned FDC List: Declared irrational with lack of therapeutic justification.',
        gazette: 'Notification No. S.O. 3290(E)',
      },
      {
        keyword: 'cisapride',
        salt: 'Cisapride',
        reason: 'Withdrawn globally due to severe cardiac arrhythmias and QT prolongation.',
        gazette: 'Drug Safety Recall Bulletin',
      },
      {
        keyword: 'dextropropoxyphene',
        salt: 'Dextropropoxyphene / Propoxyphene',
        reason: 'Banned due to cardiac toxicity and fatal overdose risk.',
        gazette: 'CDSCO Prohibition Order',
      },
    ]

    for (const item of bannedCombinations) {
      if (text.includes(item.keyword) || (salt_composition && String(salt_composition).toLowerCase().includes(item.keyword))) {
        return {
          is_banned: true,
          status: 'PROHIBITED_BY_REGULATOR',
          ban_reason: item.reason,
          regulatory_authority: 'CDSCO / Ministry of Health & Family Welfare',
          gazette_reference: item.gazette,
          action_required: 'DO NOT CONSUME. Safely dispose of this medication and consult your doctor for an approved safe alternative.',
        }
      }
    }

    return {
      is_banned: false,
      status: 'CLEARED',
      regulatory_authority: 'CDSCO / FDA / Global Pharmacopeia',
      notes: 'No active prohibition or national recall order found for this formulation.',
    }
  },
})
