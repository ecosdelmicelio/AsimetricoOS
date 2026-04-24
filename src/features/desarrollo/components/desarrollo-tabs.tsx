'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  FlaskConical, 
  History, 
  BookOpen, 
  TestTube2,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export type TabId = 'pipeline' | 'archivo' | 'biblioteca' | 'laboratorio'

interface Tab {
  id: TabId
  label: string
  icon: LucideIcon
  description: string
}

const TABS: Tab[] = [
  { 
    id: 'pipeline', 
    label: 'Pipeline I+D', 
    icon: FlaskConical,
    description: 'Sprints y Muestreo'
  },
  { 
    id: 'archivo', 
    label: 'Archivo Técnico', 
    icon: History,
    description: 'Productos Aprobados'
  },
  { 
    id: 'biblioteca', 
    label: 'Biblioteca Técnica', 
    icon: BookOpen,
    description: 'Master Specs y Fit'
  },
  { 
    id: 'laboratorio', 
    label: 'Laboratorio', 
    icon: TestTube2,
    description: 'Fichas de Materiales'
  },
]

export function DesarrolloTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabId) || 'pipeline'
  const [isPending, startTransition] = useTransition()

  const handleTabChange = (id: TabId) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', id)
      router.push(`?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-[24px] border border-slate-200/60 w-fit">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={isPending}
            className={cn(
              "group relative flex items-center gap-2.5 px-5 py-2.5 rounded-[18px] transition-all duration-300",
              isActive 
                ? "bg-white shadow-sm ring-1 ring-slate-200/50" 
                : "hover:bg-white/40 opacity-50 hover:opacity-100"
            )}
          >
            <Icon className={cn(
              "w-4 h-4 transition-colors",
              isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600"
            )} />
            <div className="flex flex-col items-start leading-none">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isActive ? "text-slate-900" : "text-slate-500"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <span className="text-[8px] font-bold text-primary-500 mt-0.5 whitespace-nowrap animate-in fade-in slide-in-from-left-1">
                  {tab.description}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
