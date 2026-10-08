import { FunctionTool } from '@google/adk'
import { z } from 'zod'

export const queryBannedDrugsListTool = new FunctionTool({
  name: 'query_banned_drugs_list',
  description: 'Reports that current regulatory status cannot be verified by this offline tool. It does not search live regulator notices.',
  parameters: z.object({ medicine_name: z.string(), salt_composition: z.string().optional() }),
  execute: async () => ({ is_banned: null, status: 'UNKNOWN', notes: 'Current official notices, jurisdiction, formulation and batch applicability have not been verified. No safety clearance was issued.' }),
})
