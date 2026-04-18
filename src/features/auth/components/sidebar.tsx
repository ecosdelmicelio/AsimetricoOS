'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { cn } from '@/shared/lib/utils'
import {
  LayoutDashboard,
  Package,
  Users,
  DollarSign,
  Factory,
  ShieldCheck,
  ShoppingCart,
  Settings2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Warehouse,
  BarChart2,
  Truck,
  FlaskConical
} from 'lucide-react'
import Image from 'next/image'
import type { UserRole } from '@/shared/types'

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; roles: UserRole[] }[] = [
  { href: '/torre-control',       label: 'Torre de Control', icon: LayoutDashboard, roles: ['orquestador'] },
  { href: '/ordenes-venta',       label: 'Órdenes de Venta', icon: DollarSign,      roles: ['orquestador'] },
  { href: '/desarrollo',          label: 'Desarrollo',       icon: FlaskConical,    roles: ['orquestador'] },
  { href: '/ordenes-produccion',  label: 'Producción',       icon: Factory,         roles: ['orquestador', 'jefe_piso'] },
  { href: '/calidad',             label: 'Calidad',          icon: ShieldCheck,     roles: ['orquestador', 'inspector'] },
  { href: '/catalogo',            label: 'Catálogo',         icon: Package,         roles: ['orquestador'] },
  { href: '/wms',                 label: 'Gestión de Bodegas', icon: Warehouse,       roles: ['orquestador'] },
  { href: '/kardex',              label: 'Kardex',           icon: BarChart2,       roles: ['orquestador'] },
  { href: '/despachos',            label: 'Despachos',        icon: Truck,           roles: ['orquestador'] },
  { href: '/compras',             label: 'Compras',          icon: ShoppingCart,    roles: ['orquestador'] },
  { href: '/finanzas',            label: 'Finanzas/Inteligencia', icon: BarChart2,   roles: ['orquestador'] },
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { authUser } = useAuth()
  
  // By default, compact unless expanded
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(
    item => !authUser || item.roles.includes(authUser.role)
  )

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarClasses = cn(
    "flex flex-col bg-primary-900 text-white transition-all duration-300 h-screen shadow-2xl z-50 shrink-0",
    "md:sticky md:top-0 md:overflow-y-auto md:overflow-x-hidden no-scrollbar",
    expanded ? "w-64" : "w-[68px]",
    // Mobile handling:
    "max-md:fixed max-md:left-0 max-md:top-0",
    mobileOpen ? "max-md:translate-x-0 max-md:w-64" : "max-md:-translate-x-full"
  )

  return (
    <>
      {/* Mobile Header (Only visible on small screens to open sidebar) */}
      <div className="flex md:hidden items-center justify-between h-14 bg-primary-900 px-4 shrink-0 shadow-md w-full z-40 fixed top-0">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shrink-0 overflow-hidden">
             <Image src="/SOCIAL-MEDIA-PERFIL.png" alt="Asimétrico" width={32} height={32} className="w-8 h-8 object-contain" />
           </div>
           <span className="font-heading font-black text-white text-lg tracking-tight">Asimétrico OS</span>
        </div>
        <button className="text-white p-2 focus:outline-none" onClick={() => setMobileOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Main Sidebar */}
      <aside className={sidebarClasses}>
        {/* Logo Header — adapts to collapsed/expanded */}
        {/* COLLAPSED: isotipo fills the full bar width */}
        {/* EXPANDED / MOBILE: small isotipo + wordmark */}
        <div className={cn(
          "flex shrink-0 border-b border-primary-800/50 transition-all duration-300 overflow-hidden",
          (expanded || mobileOpen)
            ? "h-20 items-center px-4 justify-between"
            : "h-[76px] items-center justify-center px-2"
        )}>

          {/* COLLAPSED: big centered isotipo */}
          {!expanded && !mobileOpen && (
            <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden shadow-lg border border-white/10">
              <Image
                src="/SOCIAL-MEDIA-PERFIL.png"
                alt="Asimétrico"
                width={52}
                height={52}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* EXPANDED / MOBILE: small isotipo + wordmark */}
          {(expanded || mobileOpen) && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10">
                <Image
                  src="/SOCIAL-MEDIA-PERFIL.png"
                  alt="Asimétrico"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-black text-white text-base tracking-tight leading-none">
                  Asimétrico
                </span>
                <span className="text-primary-400 text-[10px] font-bold uppercase tracking-[0.15em] mt-0.5">
                  OS Platform
                </span>
              </div>
            </div>
          )}

          {mobileOpen && (
            <button className="md:hidden text-primary-300 hover:text-white shrink-0" onClick={() => setMobileOpen(false)}>
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto no-scrollbar overflow-x-hidden">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={!expanded && !mobileOpen ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium transition-all group overflow-hidden',
                  isActive
                    ? 'bg-primary-700 text-white shadow-neu-primary-inset'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "" : "group-hover:scale-110")} />
                <span className={cn(
                  "whitespace-nowrap transition-opacity duration-300", 
                  (expanded || mobileOpen) ? "opacity-100" : "opacity-0 hidden"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer / User Area */}
        <div className="px-3 pb-4 shrink-0 flex flex-col gap-2 border-t border-primary-800/50 pt-4">
          {/* Toggle Button (Desktop only) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="hidden md:flex items-center justify-center h-10 w-full rounded-xl text-primary-300 hover:text-white hover:bg-primary-800 transition-colors"
            title={expanded ? "Contraer menú" : "Expandir menú"}
          >
            {expanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          {authUser && (
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary-950/30 overflow-hidden transition-all mt-2",
              (expanded || mobileOpen) ? "justify-between" : "justify-center"
            )}>
              {(expanded || mobileOpen) && (
                 <div className="flex flex-col min-w-0">
                   <span className="text-body-sm font-medium text-white truncate max-w-[140px]">{authUser.profile.full_name}</span>
                   <span className="text-[10px] text-primary-400 capitalize truncate">{ROLE_LABEL[authUser.role]}</span>
                 </div>
              )}
              <button
                onClick={handleLogout}
                className="text-primary-400 hover:text-red-400 transition-colors shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
