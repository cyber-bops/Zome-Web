import { AuthFlow } from '../auth-flow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Log in · Zome' }

export default function SignIn() {
  return <AuthFlow mode="log-in" />
}
