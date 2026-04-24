'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { getMisNotificaciones, marcarComoLeida } from '@/shared/services/notification-actions'
import { cn, formatDate } from '@/shared/lib/utils'
import { toast } from 'sonner'

export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data } = await getMisNotificaciones()
      setNotificaciones(data || [])
      setUnreadCount(data?.filter((n: any) => !n.leida).length || 0)
    }
    load()
    // Poll every 60 seconds
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = async (id: string) => {
    const res = await marcarComoLeida(id)
    if (res.success) {
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-primary-300 hover:text-white hover:bg-primary-800 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-primary-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Notificaciones</h3>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            {notificaciones.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sin notificaciones</p>
              </div>
            ) : (
              notificaciones.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 border-b border-slate-50 transition-colors group relative",
                    n.leida ? "opacity-60" : "bg-primary-50/30"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[11px] font-black text-slate-900 uppercase leading-tight">{n.titulo}</p>
                    {!n.leida && (
                      <button 
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1 rounded-lg bg-emerald-100 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Marcar como leída"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{n.mensaje}</p>
                  <p className="text-[9px] text-slate-300 mt-2 font-bold">{formatDate(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
