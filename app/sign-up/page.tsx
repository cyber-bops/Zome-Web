import { AuthFlow } from '../auth-flow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create your account · Zome' }

export default function SignUp() {
  return <AuthFlow mode="create" />
}
