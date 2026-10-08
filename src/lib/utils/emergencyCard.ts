export interface EmergencyMember {
  full_name: string; allergies?: string[] | null; chronic_conditions?: string[] | null
  blood_group?: string | null; gender?: string | null
}
export interface EmergencyMedicine { medicine_name: string; salt_composition?: string | null }

export function buildEmergencyCard(member: EmergencyMember, medicines: EmergencyMedicine[], age: string, generated: string, maxBytes = 1200) {
  const essential = `EMERGENCY RECORDS — confirm current treatment\nName: ${member.full_name}\nAge: ${age}\nBlood group: ${member.blood_group || 'Unknown'}\nGender: ${member.gender || 'Unknown'}\nAllergies: ${member.allergies?.length ? member.allergies.join(', ') : 'Not recorded; absence not assessed'}\nConditions: ${member.chronic_conditions?.join(', ') || 'None recorded'}\nGenerated: ${generated}\nProvided by Medafora`
  const lines = medicines.map(m => `- ${m.medicine_name}${m.salt_composition ? ` (${m.salt_composition})` : ''}`)
  const fullText = essential + '\n\nCABINET ITEMS (current treatment not verified):\n' + (lines.join('\n') || 'None recorded')
  const bytes = (s: string) => new TextEncoder().encode(s).length
  const payload = (included: string[]) => essential + `\n\nCABINET: ${included.length} of ${lines.length} items listed\n` + (included.join('\n') || 'No items listed') + (included.length < lines.length ? `\n${lines.length - included.length} items omitted. Read the full printed card.` : '')
  if (bytes(payload([])) > maxBytes) return { fullText, qrText: null, omitted: lines.length }
  const included: string[] = []
  for (const line of lines) {
    if (bytes(payload([...included, line])) > maxBytes) break
    included.push(line)
  }
  return { fullText, qrText: payload(included), omitted: lines.length - included.length }
}
