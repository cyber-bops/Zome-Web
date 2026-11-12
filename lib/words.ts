// The iOS app's words (CarePurseView, ProfileChecklistView), for the web.

export const stepWord: Record<string, string> = {
  bvn: 'Add your BVN', nin: 'Add your NIN', selfie: 'Take a selfie', personal_info: 'Personal information',
  phone: 'Phone number', next_of_kin: 'Next of kin', bank_account: 'Link a bank account',
}

/** One line under a step, saying what it gives. */
export const stepWhy: Record<string, string> = {
  bvn: 'Hold more in your purse, and pay any account.', nin: 'Confirms who you are.', selfie: 'Matches you to your ID.',
  personal_info: 'Your name as your bank has it.', phone: 'So Zome can reach you.', next_of_kin: 'Someone Zome can reach for you.',
  bank_account: 'Add money straight from your bank.',
}

const named: Record<string, string> = { top_up: 'Added', reversal: 'Bank reversal', interest: 'Interest', cashback: 'Cashback', payment: 'Paid a bill' }

/** What a movement is called on a receipt. */
export function movementTitle(m: { kind: string; amount_kobo: number; from?: string }): string {
  if (m.kind === 'team') return m.from ? `From ${m.from}` : 'From your employer'
  if (m.kind === 'payment' && m.from) return `Paid ${m.from}`
  if (m.kind === 'gift') return m.from && m.from !== 'Anonymous' ? `From ${m.from}` : 'A gift'
  return named[m.kind] ?? (m.amount_kobo >= 0 ? 'Received' : 'Paid')
}

/** The small line under it. */
export function movementWhat(m: { kind: string; amount_kobo: number }): string {
  switch (m.kind) {
    case 'top_up': return 'Bank transfer'
    case 'interest': return 'Paid on your balance'
    case 'cashback': return 'For paying with Zome'
    case 'payment': return 'From your Care Purse'
    case 'team': return 'Health allowance'
    case 'gift': return 'Through your family link'
    case 'reversal': return 'Returned by the bank'
    default: return m.amount_kobo >= 0 ? 'Into your purse' : 'From your purse'
  }
}

/** The ink stamp a line carries, if any. */
export function movementStamp(m: { kind: string }): { word: string; tone: 'blue' | 'green' } | null {
  if (m.kind === 'payment') return { word: 'PAID', tone: 'blue' }
  if (m.kind === 'team') return { word: 'BENEFIT', tone: 'green' }
  if (m.kind === 'gift') return { word: 'GIFT', tone: 'green' }
  return null
}
