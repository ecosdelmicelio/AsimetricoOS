'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { cn } from '@/shared/lib/utils'
import {
  LayoutDashboard,
  Package,
  Users,
  ClipboardList,
  Factory,
  ShieldCheck,
  DollarSign,
  ShoppingCart,
  Settings2,
  LogOut,
} from 'lucide-react'
import type { UserRole } from '@/shared/types'

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; roles: UserRole[] }[] = [
  { href: '/torre-control',       label: 'Torre de Control', icon: LayoutDashboard, roles: ['orquestador'] },
  { href: '/ordenes-venta',       label: 'Órdenes de Venta', icon: ClipboardList,   roles: ['orquestador'] },
  { href: '/ordenes-produccion',  label: 'Producción',       icon: Factory,         roles: ['orquestador', 'jefe_piso'] },
  { href: '/calidad',             label: 'Calidad',          icon: ShieldCheck,     roles: ['orquestador', 'inspector'] },
  { href: '/catalogo',            label: 'Catálogo',         icon: Package,         roles: ['orquestador'] },
  { href: '/compras',             label: 'Compras',          icon: ShoppingCart,    roles: ['orquestador'] },
  { href: '/terceros',            label: 'Terceros',         icon: Users,           roles: ['orquestador'] },
  { href: '/configuracion',       label: 'Configuración',    icon: Settings2,       roles: ['orquestador'] },
  { href: '/taller',              label: 'Mi Taller',        icon: Factory,         roles: ['taller'] },
]

const ROLE_LABEL: Record<UserRole, string> = {
  orquestador: 'Orquestador',
  jefe_piso:   'Jefe de Piso',
  inspector:   'Inspector',
  taller:      'Taller',
}

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { authUser } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    item => !authUser || item.roles.includes(authUser.role)
  )

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-primary-900 text-white sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <span className="font-heading font-bold text-white text-body-lg tracking-tight">
              Asimétrico OS
            </span>
          </div>

          {/* Nav links — overflow scroll to prevent breaking viewport */}
          <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-body-sm font-medium transition-all shrink-0',
                    isActive
                      ? 'bg-primary-700 text-white shadow-neu-primary-inset'
                      : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {authUser && (
              <span className="hidden lg:block text-body-xs text-primary-300 truncate max-w-[150px]">
                {authUser.profile.full_name} · {ROLE_LABEL[authUser.role]}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800 transition-all text-body-sm shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
