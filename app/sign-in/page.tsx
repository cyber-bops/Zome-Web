import { AuthFlow } from '../auth-flow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Log in · Zome' }

export default function SignIn() {
  // Read at request time, so one build serves any environment.
  return <AuthFlow mode="log-in" googleClientId={process.env.ZOME_GOOGLE_WEB_CLIENT_ID || undefined} />
}
