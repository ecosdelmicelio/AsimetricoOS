import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neu-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
