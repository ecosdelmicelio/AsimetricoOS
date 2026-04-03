'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import type { UserRole } from '@/shared/types'

const ROLE_REDIRECT: Record<UserRole, string> = {
  orquestador: '/torre-control',
  jefe_piso:   '/ordenes-produccion',
  inspector:   '/calidad',
  taller:      '/taller',
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    // Fetch profile to redirect based on role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null }
      const role = ((profile?.role) ?? 'orquestador') as UserRole
      router.push(ROLE_REDIRECT[role] ?? '/torre-control')
    } else {
      router.push('/torre-control')
    }
    router.refresh()
  }

  return (
    <div className="w-full rounded-2xl bg-neu-base p-8 shadow-neu">
      {/* Logo / Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-neu-base shadow-neu mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl font-heading font-bold text-primary-500">A</span>
        </div>
        <h1 className="text-display-xs font-heading text-primary-900 font-bold">Asimétrico OS</h1>
        <p className="text-foreground-secondary text-body-sm mt-1">Torre de Control</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-body-sm font-medium text-foreground-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="tu@asimetricolab.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-12 px-4 rounded-xl bg-neu-base shadow-neu-inset text-body-md text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary-400/40 transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-body-sm font-medium text-foreground-secondary">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full h-12 px-4 rounded-xl bg-neu-base shadow-neu-inset text-body-md text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary-400/40 transition-all"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 shadow-neu-inset-sm">
            <p className="text-body-sm text-error-600">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-md transition-all active:shadow-neu-inset disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-neu-lg mt-2"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
