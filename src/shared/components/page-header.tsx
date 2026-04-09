import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  icon: ElementType
  action?: {
    label: string
    href?: string
    onClick?: () => void
    icon?: ElementType
  }
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action
}: PageHeaderProps) {
  const ActionIcon = action?.icon || Plus

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[14px] bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm shrink-0">
          <Icon className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none uppercase">{title}</h1>
          {subtitle && (
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{subtitle}</p>
          )}
        </div>
      </div>
      
      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all shadow-sm shrink-0"
            >
              <ActionIcon className="w-4 h-4" />
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all shadow-sm shrink-0"
            >
              <ActionIcon className="w-4 h-4" />
              {action.label}
            </button>
          )}
        </>
      )}
    </div>
  )
}
