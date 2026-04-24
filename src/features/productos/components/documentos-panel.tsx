'use client'

import { FileText, Download, ExternalLink, Image as ImageIcon, Ruler } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface Asset {
  id: string
  tipo: 'foto' | 'ficha_tecnica' | 'molde' | 'guia_empaque' | 'otro'
  url: string
  descripcion: string
  created_at: string
}

interface Props {
  assets: Asset[]
}

export function DocumentosPanel({ assets }: Props) {
  if (assets.length === 0) return null

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'foto': return <ImageIcon className="w-5 h-5" />
      case 'ficha_tecnica': return <FileText className="w-5 h-5" />
      case 'molde': return <Ruler className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-black/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-body-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary-600" />
        Documentación Técnica Heredada
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.map((asset) => (
          <div 
            key={asset.id} 
            className="group flex items-center justify-between p-5 rounded-3xl bg-white border border-slate-100 hover:border-primary-200 hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                {getIcon(asset.tipo)}
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-900 uppercase leading-tight">{asset.descripcion || asset.tipo.replace('_', ' ')}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Cargado el {new Date(asset.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <a 
              href={asset.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              title="Abrir Documento"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
