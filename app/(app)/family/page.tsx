import { redirect } from 'next/navigation'

// Family became Care Fund's Family setup (13 November 2026); old links still land.
export default function FamilyPage() {
  redirect('/care-fund?mode=family')
}
