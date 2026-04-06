import { getDespachoById } from '@/features/ordenes-venta/services/despachos-actions'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { sortTallas, formatCurrency } from '@/shared/lib/utils'
import { ArrowLeft, Printer, Box, Package, Globe, Tag } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClientPrintHandler } from './client-print-handler'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ binId?: string }>
}

export default async function PackingListReportPage({ params, searchParams }: Props) {
  const { id } = await params
  const { binId: targetBinId } = await searchParams
  
  const { data: despacho, error } = await getDespachoById(id)

  if (error || !despacho) {
    return notFound()
  }

  const allDetalles = despacho.despacho_detalle || []
  
  // Group by Bin
  const binsMap = new Map<string, { code: string; items: any[] }>()
  allDetalles.forEach((det: any) => {
    const bId = det.bin_id || 'unassigned'
    const bCode = det.bines?.codigo || `BIN-${bId.slice(0,4).toUpperCase()}`
    
    if (targetBinId && bId !== targetBinId) return

    if (!binsMap.has(bId)) {
      binsMap.set(bId, { code: bCode, items: [] })
    }
    binsMap.get(bId)!.items.push(det)
  })

  const bins = Array.from(binsMap.values())

  if (bins.length === 0) {
    return (
      <div className="p-20 text-center">
        <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-slate-800 mb-2">No se encontraron productos.</h1>
        <p className="text-slate-500 mb-8">El bin solicitado no existe o no tiene unidades asignadas en este despacho.</p>
        <Link href={`/ordenes-venta/${despacho.ov_id}`} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          Revisar Orden de Venta
        </Link>
      </div>
    )
  }

  const totalGralUnits = bins.reduce((s, b) => s + b.items.reduce((bs, i) => bs + i.cantidad, 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white p-4 sm:p-12 font-sans text-slate-900">
      {/* Navigation (Hidden in Print) */}
      <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between print:hidden">
        <Link 
          href={`/ordenes-venta/${despacho.ov_id}`}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero OV
        </Link>
        <ClientPrintHandler />
      </div>

      <Card className="max-w-5xl mx-auto bg-white shadow-2xl rounded-[2.5rem] border-none p-10 sm:p-16 print:shadow-none print:p-0 print:rounded-none">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-slate-100 pb-12 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-primary-200 print:shadow-none">
              A
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter leading-none mb-2">LISTA DE EMPAQUE</h1>
              <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                <span>ASIMÉTRICO LAB CO.</span>
                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                <span className="text-primary-600">ID: DESP-{despacho.id.slice(0,8).toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 min-w-[200px]">
            <div className="bg-slate-50 px-6 py-4 rounded-[1.5rem] border border-slate-100 text-right w-full">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orden de Venta</p>
              <p className="text-2xl font-black text-primary-700 tracking-tighter leading-none">{despacho.ordenes_venta.codigo}</p>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider italic">
              {new Date(despacho.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Client & Logistics Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 px-2">
          <div className="space-y-6">
            <SectionHeader title="Destinatario" />
            <div className="space-y-2">
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{despacho.ordenes_venta.terceros.nombre}</p>
              <div className="flex items-center gap-3 text-slate-500 font-medium">
                <Tag className="w-4 h-4" />
                <span className="text-sm">NIT: {despacho.ordenes_venta.terceros.nit || 'C.C. No Registrado'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 font-medium bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 uppercase text-xs">
                <Globe className="w-4 h-4 text-primary-500" />
                <span>{despacho.ordenes_venta.terceros.direccion || 'Entrega en Planta'}</span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <SectionHeader title="Parámetros de Envío" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <LogDetail label="Transporte" value={despacho.transporte || 'PROPIO / INTERNO'} />
              <LogDetail label="Bultos Totales" value={despacho.total_bultos?.toString() || '1'} />
              <LogDetail label="Tipo Entrega" value={despacho.tipo_envio?.replace('_', ' ').toUpperCase() || 'NORMAL'} />
              <LogDetail label="Guía No." value={despacho.guia || 'SIN GUÍA'} />
            </div>
          </div>
        </div>

        {/* Global Summary (Mini Matrices) */}
        <div className="mb-16 bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 print:bg-white print:border-slate-200">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
             <Package className="w-4 h-4" /> Resumen Consolidado del Despacho
           </h3>
           <div className="flex flex-wrap gap-4">
              {bins.map((bin, bIdx) => {
                const bUnits = bin.items.reduce((s, i) => s + i.cantidad, 0)
                return (
                  <div key={bIdx} className="bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:scale-105 print:scale-100">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-black text-xs">
                      {bIdx + 1}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{bin.code}</p>
                      <p className="text-lg font-black text-slate-900 leading-none">{bUnits} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Uds</span></p>
                    </div>
                  </div>
                )
              })}
              <div className="bg-primary-600 px-6 py-4 rounded-2xl shadow-xl shadow-primary-200 flex items-center gap-4 text-white print:shadow-none">
                <Printer className="w-5 h-5 text-primary-200" />
                <div>
                   <p className="text-[9px] font-black text-primary-200 uppercase leading-none mb-1">Total General</p>
                   <p className="text-xl font-black leading-none">{totalGralUnits} <span className="text-[10px] text-primary-200 font-bold uppercase ml-1">UDS</span></p>
                </div>
              </div>
           </div>
        </div>

        {/* BIN SECTIONS (Optimized for multiple per page) */}
        <div className="space-y-12">
          {bins.map((bin, bIdx) => (
            <div key={bIdx} className="break-inside-avoid border-t-2 border-dashed border-slate-100 pt-10 first:border-none first:pt-0">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                     <Box className="w-5 h-5" />
                   </div>
                   <div>
                     <h4 className="text-lg font-black text-slate-900 leading-tight">IDENTIFICACIÓN DEL BIN: <span className="text-primary-600">{bin.code}</span></h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Contenido detallado · Matriz de Tallas</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Subtotal Unidades</p>
                   <p className="text-xl font-black text-slate-900 leading-none">
                     {bin.items.reduce((s, i) => s + i.cantidad, 0)} <span className="text-[10px] font-bold text-slate-400">UDS</span>
                   </p>
                 </div>
               </div>
               
               <BinMatrix items={bin.items} />
            </div>
          ))}
        </div>

        {/* Footer Area */}
        <div className="mt-24 pt-16 border-t-2 border-black/5">
          <div className="grid grid-cols-2 gap-24 w-full mb-16">
            <SignatureLine label="Control Calidad (Logística)" />
            <SignatureLine label="Recepción Cliente (Sello/Firma)" />
          </div>
          
          <div className="flex flex-col items-center">
            <p className="text-[10px] text-slate-400 font-black tracking-[0.25em] uppercase mb-1">
              Fabricación de Alta Precisión por Asimétrico Lab Co. 
            </p>
            <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.4em]">
              Sistemas de Ingeniería para Confección · Medellín, Colombia · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background: white !important; font-size: 10pt; }
          .print\\:hidden { display: none !important; }
          .break-inside-avoid { break-inside: avoid; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  )
}

function BinMatrix({ items }: { items: any[] }) {
  const tallasSet = new Set<string>()
  const dataMap = new Map<string, Record<string, number>>()
  const infoMap = new Map<string, { nombre: string; color: string }>()

  items.forEach(det => {
    const ref = det.productos.referencia
    const talla = det.talla
    const color = det.color || det.productos.color || 'N/A'
    const key = `${ref}-${color}`

    if (!dataMap.has(key)) {
      dataMap.set(key, {})
      infoMap.set(key, { 
        nombre: det.productos.nombre, 
        color: color 
      })
    }
    
    const row = dataMap.get(key)!
    row[talla] = (row[talla] || 0) + det.cantidad
    tallasSet.add(talla)
  })

  const sortedTallas = sortTallas(Array.from(tallasSet))
  const rows = Array.from(dataMap.entries())

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3 px-4 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Ref / Variante</th>
            {sortedTallas.map(t => (
              <th key={t} className="py-3 px-2 text-center font-black text-slate-500 uppercase tracking-wider border-r border-slate-200 w-10">{t}</th>
            ))}
            <th className="py-3 px-4 text-center font-black text-slate-900 uppercase tracking-wider bg-slate-100/50 w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, cantMap], idx) => {
            const info = infoMap.get(key)!
            const ref = key.split('-')[0]
            const total = Object.values(cantMap).reduce((a, b) => a + b, 0)
            return (
              <tr key={key} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                <td className="py-3 px-4 border-r border-slate-200">
                  <span className="font-black text-slate-900 block leading-none mb-1">{ref}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-medium text-slate-400 uppercase truncate max-w-[120px]">{info.nombre}</span>
                    <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1 rounded">{info.color}</span>
                  </div>
                </td>
                {sortedTallas.map(t => (
                  <td key={t} className="py-3 px-2 text-center border-r border-slate-100 font-bold text-slate-600">
                    {cantMap[t] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-black text-slate-900 bg-slate-50/30">
                  {total}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
           <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
             <td className="py-3 px-4 uppercase text-[9px] text-slate-500 border-r border-slate-200 tracking-tighter">Subtotal Bin</td>
             {sortedTallas.map(t => {
               const colSum = rows.reduce((s, [, cm]) => s + (cm[t] || 0), 0)
               return <td key={t} className="py-3 px-2 text-center text-slate-600 border-r border-slate-100">{colSum || '-'}</td>
             })}
             <td className="py-3 px-4 text-center text-primary-700 bg-primary-50/50">
               {rows.reduce((s, [, cm]) => s + Object.values(cm).reduce((a, b) => a + b, 0), 0)}
             </td>
           </tr>
        </tfoot>
      </table>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
      <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
      {title}
    </h3>
  )
}

function LogDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1.5">{label}</p>
      <p className="text-sm font-black text-slate-800 tracking-tight">{value}</p>
    </div>
  )
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="text-center group">
      <div className="h-0.5 w-full bg-slate-200 mb-6 group-hover:bg-primary-200 transition-colors" />
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 border border-slate-100 inline-block px-3 py-1 rounded-full">{label}</p>
    </div>
  )
}
