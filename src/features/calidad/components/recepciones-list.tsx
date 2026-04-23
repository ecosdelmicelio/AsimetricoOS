import Link from 'next/link'
import { Package, ShieldAlert, ChevronRight, Clock } from 'lucide-react'
import { getRecepcionesEnCuarentena } from '@/features/calidad/services/calidad-actions'
import { formatDate } from '@/shared/lib/utils'

export async function RecepcionesList() {
  const recepciones = await getRecepcionesEnCuarentena()

  if (recepciones.length === 0) {
    return (
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-16 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Cuarentena Vacía</h3>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
          No hay materiales o productos pendientes de inspección de ingreso
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {recepciones.map((rec) => (
        <RecepcionCuarentenaCard key={rec.id} rec={rec} />
      ))}
    </div>
  )
}

function RecepcionCuarentenaCard({ rec }: { rec: any }) {
  const isMP = !!rec.material_id
  const itemNombre = isMP ? rec.materiales?.nombre : rec.productos?.nombre
  const itemCodigo = isMP ? rec.materiales?.codigo : rec.productos?.referencia
  const proveedor = rec.ordenes_compra?.terceros?.nombre || '—'

  return (
    <Link
      href={`/calidad/recepcion/${rec.id}`}
      className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 lg:p-8 flex items-center justify-between transition-all hover:shadow-xl hover:border-slate-300 active:scale-[0.99]"
    >
      <div className="flex items-center gap-6 min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">{itemCodigo}</h4>
            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
              EN CUARENTENA
            </span>
            <span className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
              {rec.ordenes_compra?.codigo}
            </span>
          </div>
          
          <p className="text-slate-600 font-bold text-sm mb-1 truncate">{itemNombre}</p>
          
          <div className="flex items-center gap-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
            <span className="truncate max-w-[200px]">{proveedor}</span>
            <span className="text-slate-200">/</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Recibido {formatDate(rec.fecha_recepcion)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3 shrink-0">
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">
            {rec.cantidad_recibida}
            <span className="text-[10px] text-slate-400 ml-1 uppercase">{isMP ? rec.materiales?.unidad : 'UND'}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 transition-colors group-hover:bg-slate-900 group-hover:text-white">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </Link>
  )
}
