import { AuthFlow } from '../auth-flow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create your account · Zome' }

export default function SignUp() {
  // Read at request time, so one build serves any environment.
  return <AuthFlow mode="create" googleClientId={process.env.ZOME_GOOGLE_WEB_CLIENT_ID || undefined} />
}
