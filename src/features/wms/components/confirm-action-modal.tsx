'use client'

import React from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false
}: Props) {
  if (!isOpen) return null

  // Si onConfirm no existe, actuamos como un modal de Alerta (un solo botón)
  const isAlertMode = !onConfirm;
  const finalConfirmText = isAlertMode ? (confirmText === 'Confirmar' ? 'Aceptar' : confirmText) : confirmText;

  const variantStyles = {
    danger: {
      bg: 'bg-red-600',
      hover: 'hover:bg-red-500',
      icon: <Trash2 className="w-5 h-5 text-red-400" />,
      ring: 'ring-red-500/10'
    },
    warning: {
      bg: 'bg-amber-600',
      hover: 'hover:bg-amber-500',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      ring: 'ring-amber-500/10'
    },
    info: {
      bg: 'bg-primary-600',
      hover: 'hover:bg-primary-500',
      icon: <AlertTriangle className="w-5 h-5 text-primary-400" />,
      ring: 'ring-primary-500/10'
    }
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className={`p-3 bg-slate-50 rounded-2xl border border-slate-100`}>
              {styles.icon}
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
            {description}
          </p>

          <div className="flex items-center gap-3">
            {!isAlertMode && (
              <button
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              disabled={isLoading}
              onClick={onConfirm || onClose}
              className={`flex-1 py-3 px-4 ${styles.bg} text-white rounded-2xl text-[10px] font-black uppercase tracking-widest ${styles.hover} transition-all shadow-lg ring-8 ${styles.ring} disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </>
              ) : finalConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
