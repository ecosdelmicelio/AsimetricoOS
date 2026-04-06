'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { 
  Package, Truck, Calendar, MapPin, ClipboardList, Plus, 
  Box, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Printer, FileText, Info 
} from 'lucide-react'
import { createDespacho, type EstadoDespacho, type TipoEnvio } from '@/features/ordenes-venta/services/despachos-actions'
import { updateEstadoOV } from '@/features/ordenes-venta/services/ov-actions'
import { formatCurrency, formatDate, sortTallas } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import Link from 'next/link'

interface Props {
  ovId: string
  despachos: any[]
  binesDisponibles: any[]
  detallesOV: any[]
  estado?: string
}

/**
 * Componente para renderizar una matriz de Referencia x Talla
 */
function BinMatrix({ items, title }: { items: any[], title?: string }) {
  const tallas = useMemo(() => sortTallas([...new Set(items.map(i => i.talla))]), [items])
  
  // Agrupar por producto (referencia + color)
  const rows = useMemo(() => {
    const map = new Map<string, { ref: string; nombre: string; color: string; cant: Record<string, number> }>()
    items.forEach(item => {
      const ref = item.productos?.referencia || item.referencia || '—'
      const nombre = item.productos?.nombre || ''
      const color = item.color || item.productos?.color || ''
      const key = `${ref}-${color}`
      
      if (!map.has(key)) {
        map.set(key, { ref, nombre, color, cant: {} })
      }
      map.get(key)!.cant[item.talla] = (map.get(key)!.cant[item.talla] || 0) + item.cantidad
    })
    return Array.from(map.values())
  }, [items])

  if (items.length === 0) return null

  return (
    <div className="mt-2 border rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm">
      {title && <div className="px-3 py-1.5 bg-black/[0.03] border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-black/[0.01] border-b border-black/5">
              <th className="text-left px-3 py-2 font-bold text-muted-foreground w-28 uppercase tracking-tighter">Referencia</th>
              <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase tracking-tighter">Producto / Color</th>
              {tallas.map(t => <th key={t} className="px-2 py-2 font-bold text-muted-foreground text-center min-w-[40px] uppercase">{t}</th>)}
              <th className="text-right px-3 py-2 font-bold text-primary-700 bg-primary-50/30">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row, idx) => {
              const totalRow = tallas.reduce((acc, t) => acc + (row.cant[t] || 0), 0)
              return (
                <tr key={`${row.ref}-${row.color}-${idx}`} className="hover:bg-primary-50/20 transition-colors">
                  <td className="px-3 py-2 font-mono font-bold text-primary-700">{row.ref}</td>
                  <td className="px-3 py-2 leading-tight">
                    <span className="block font-medium">{row.nombre}</span>
                    {row.color && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[8px] uppercase">{row.color}</span>
                    )}
                  </td>
                  {tallas.map(t => (
                    <td key={t} className="px-2 py-2 text-center">
                      {row.cant[t] ? <span className="font-semibold text-foreground">{row.cant[t]}</span> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-primary-600 bg-primary-50/30">{totalRow}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-black/[0.02] font-black border-t-2 border-black/5">
              <td className="px-3 py-2 text-primary-800" colSpan={2}>TOTAL ENTREGA</td>
              {tallas.map(t => {
                const colTotal = rows.reduce((acc, r) => acc + (r.cant[t] || 0), 0)
                return <td key={t} className="px-2 py-2 text-center text-primary-800">{colTotal || '—'}</td>
              })}
              <td className="px-3 py-2 text-right text-primary-800 bg-primary-100/30">
                {rows.reduce((acc, r) => acc + Object.values(r.cant).reduce((s, c) => s + c, 0), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export function OVDespachos({ ovId, despachos, binesDisponibles, detallesOV, estado }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [expandedBin, setExpandedBin] = useState<string | null>(null)
  
  // Estado del formulario
  const [form, setForm] = useState({
    transportadora: '',
    guia_seguimiento: '',
    tipo_envio: 'interno' as TipoEnvio,
    notas: '',
    total_bultos: 0,
    lineas: [] as { bin_id: string; codigo: string; items: any[] }[]
  })

  // Resumen dinámico de selección
  const selectionSummary = useMemo(() => {
    const summary: Record<string, number> = {}
    let total = 0
    form.lineas.forEach(bin => {
      bin.items.forEach(item => {
        const ref = item.productos?.referencia || item.referencia || 'Desconocido'
        summary[ref] = (summary[ref] || 0) + item.cantidad
        total += item.cantidad
      })
    })
    return { breakdown: Object.entries(summary), total }
  }, [form.lineas])

  // Calcular resumen de unidades por despachar
  const unidadesPorDespachar = useMemo(() => detallesOV.map(d => {
    const despachado = despachos.reduce((sum, desp) => 
      sum + (desp.despacho_detalle?.filter((ld: any) => ld.producto_id === d.producto_id && ld.talla === d.talla)
        .reduce((s: number, l: any) => s + l.cantidad, 0) || 0), 0)
    return {
      ...d,
      cantidad_pendiente: d.cantidad - despachado
    }
  }).filter(d => d.cantidad_pendiente > 0), [detallesOV, despachos])

  const handleFinalizarEntrega = async () => {
    if (confirm('¿Estás seguro de marcar esta orden como Entregada? Esto significa que la operación comercial ha finalizado y se ha completado la entrega de los despachos.')) {
      startTransition(async () => {
        const res = await updateEstadoOV(ovId, 'entregada')
        if (res.error) alert(res.error)
      })
    }
  }

  const handleCreate = async () => {
    if (form.lineas.length === 0) return alert('Selecciona al menos un BIN para despachar')
    
    const input = {
      ov_id: ovId,
      transportadora: form.transportadora,
      guia_seguimiento: form.guia_seguimiento,
      tipo_envio: form.tipo_envio,
      notas: form.notas,
      total_bultos: form.total_bultos || form.lineas.length,
      lineas: form.lineas.flatMap(bin => 
        bin.items.map(item => ({
          producto_id: item.producto_id,
          talla: item.talla,
          cantidad: item.cantidad,
          bin_id: bin.bin_id
        }))
      )
    }

    startTransition(async () => {
      const res = await createDespacho(input as any)
      if (res.error) {
        alert(res.error)
      } else {
        setShowForm(false)
        setForm({
          transportadora: '',
          guia_seguimiento: '',
          tipo_envio: 'interno',
          notas: '',
          total_bultos: 0,
          lineas: []
        })
      }
    })
  }

  const toggleBin = (bin: any) => {
    setForm(prev => {
      const exists = prev.lineas.find(l => l.bin_id === bin.id)
      let newLines
      if (exists) {
        newLines = prev.lineas.filter(l => l.bin_id !== bin.id)
      } else {
        newLines = [...prev.lineas, { bin_id: bin.id, codigo: bin.codigo, items: bin.items }]
      }
      return { 
        ...prev, 
        lineas: newLines,
        total_bultos: newLines.length // Auto-update total_bultos by default
      }
    })
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Botón Nuevo Despacho */}
      {!showForm && unidadesPorDespachar.length > 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-5 rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-100 hover:shadow-2xl hover:bg-primary-700 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold text-body-md">CREAR NUEVO DESPACHO</span>
        </button>
      )}

      {/* Formulario de Despacho */}
      {showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 border-l-8 border-primary-500 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-body-lg font-black text-foreground flex items-center gap-2 tracking-tight uppercase">
              <Truck className="w-6 h-6 text-primary-600" />
              Nuevo Despacho
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={isPending} className="font-bold text-muted-foreground hover:text-red-500">
              CANCELAR
            </Button>
          </div>

          {/* Banner de Resumen superior */}
          {form.lineas.length > 0 && (
            <div className="mb-8 p-5 rounded-2xl bg-primary-600 shadow-lg shadow-primary-200 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Resumen de Entrega</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {selectionSummary.breakdown.map(([ref, qty]) => (
                    <span key={ref} className="text-xs font-bold whitespace-nowrap">
                      {ref}: <span className="text-primary-100">{qty}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-xl text-center min-w-[120px] backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-tighter leading-none opacity-80 mb-1">Total Unidades</p>
                <p className="text-2xl font-black leading-none">{selectionSummary.total}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-muted-foreground px-1 tracking-widest">Bines Disponibles en Bodega</Label>
                <div className="grid gap-3 max-h-[500px] overflow-y-auto p-2 bg-black/[0.02] rounded-2xl border border-black/5 custom-scrollbar">
                  {binesDisponibles.length === 0 ? (
                    <div className="text-center py-16">
                      <Box className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground italic font-medium">No hay bines disponibles para esta orden</p>
                    </div>
                  ) : (
                    binesDisponibles.map(bin => {
                      const isSelected = form.lineas.some(l => l.bin_id === bin.id)
                      const isExpanded = expandedBin === bin.id
                      const udsTotal = bin.items.reduce((s: number, i: any) => s + i.cantidad, 0)
                      
                      return (
                        <div key={bin.id} className={`rounded-xl border transition-all ${isSelected ? 'border-primary-300 ring-2 ring-primary-100 shadow-sm' : 'border-black/5 hover:border-primary-200'}`}>
                          <div 
                            className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-primary-50/50' : 'bg-white hover:bg-neutral-50'}`}
                            onClick={() => toggleBin(bin)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-muted-foreground'}`}>
                                <Box className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-black font-mono tracking-tighter text-foreground">{bin.codigo}</p>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase">{udsTotal} unidades · {bin.items.length} Referencias</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedBin(isExpanded ? null : bin.id);
                                }}
                                className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary-100 text-primary-700' : 'hover:bg-black/5 text-muted-foreground'}`}
                                title="Ver Detalle"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              {isSelected ? <CheckCircle2 className="w-6 h-6 text-primary-600" /> : <div className="w-6 h-6 rounded-full border-2 border-black/5" />}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-4 border-t bg-black/[0.01] animate-in slide-in-from-top-2">
                              <BinMatrix items={bin.items} title={`Detalle del BIN ${bin.codigo}`} />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-black/5 shadow-sm space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tipo Envío</Label>
                    <Select 
                      value={form.tipo_envio} 
                      onValueChange={(v: any) => setForm({...form, tipo_envio: v})}
                    >
                      <SelectTrigger className="rounded-xl border-black/10 font-bold text-xs"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interno">INTERNO (Propio)</SelectItem>
                        <SelectItem value="externo">EXTERNO (Flota)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Bultos</Label>
                    <Input 
                      type="number" 
                      className="rounded-xl border-black/10 font-bold"
                      value={form.total_bultos}
                      onChange={e => setForm({...form, total_bultos: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Transportadora / Vehículo</Label>
                  <Input 
                    placeholder="Ej: Servientrega, Placa Camión..." 
                    className="rounded-xl border-black/10 font-medium"
                    value={form.transportadora}
                    onChange={e => setForm({...form, transportadora: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Guía / Control No.</Label>
                  <Input 
                    placeholder="Número de seguimiento" 
                    className="rounded-xl border-black/10 font-mono text-sm font-bold"
                    value={form.guia_seguimiento}
                    onChange={e => setForm({...form, guia_seguimiento: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Notas Adicionales</Label>
                  <textarea 
                    className="w-full min-h-[120px] bg-white border border-black/10 rounded-xl p-4 text-xs font-medium focus:ring-2 focus:ring-primary-500/20 transition-all outline-none resize-none"
                    placeholder="Instrucciones especiales de entrega..."
                    value={form.notas}
                    onChange={e => setForm({...form, notas: e.target.value})}
                  />
                </div>

                <Button 
                  className="w-full py-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-200 transition-all active:scale-[0.98]" 
                  onClick={handleCreate}
                  disabled={isPending || form.lineas.length === 0}
                >
                  {isPending ? 'REGISTRANDO...' : 'CONFIRMAR Y DESPACHAR'}
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-3">
                <Info className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                  Al confirmar, los bines seleccionados se marcarán como "Despachados" y se generará automáticamente el registro en el historial para impresión de la Lista de Empaque.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Despachos (Estilo FICHA) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-foreground text-body-md uppercase tracking-tight">Historial de Despachos</h3>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-bold text-[10px]">{despachos.length} REGISTROS</Badge>
            {estado && !['entregada', 'cancelada'].includes(estado) && (
              <Button 
                onClick={handleFinalizarEntrega} 
                disabled={isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] tracking-wider uppercase shadow-lg shadow-green-200"
                title="Marcar la Orden de Venta como Entregada y Completada"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Marcar como Entregada
              </Button>
            )}
          </div>
        </div>
        
        {despachos.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-black/5 py-20 text-center bg-white/50 backdrop-blur-sm">
            <Package className="w-12 h-12 text-muted-foreground/10 mx-auto mb-4" />
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Sin despachos registrados</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {despachos.map((desp) => {
              const totalUds = desp.despacho_detalle?.reduce((s: number, d: any) => s + d.cantidad, 0) || 0
              
              return (
                <div 
                  key={desp.id}
                  className="rounded-3xl bg-white shadow-sm border border-black/5 overflow-hidden group hover:shadow-xl hover:shadow-black/5 transition-all"
                >
                  {/* Encabezado Ficha */}
                  <div className="bg-black/[0.02] border-b border-black/5 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-black/5 flex items-center justify-center text-primary-600">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm tracking-tighter">DESP-{desp.id.slice(0,8).toUpperCase()}</span>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase ${
                            desp.estado === 'entregado' ? 'text-green-600 border-green-200' : 'text-primary-600 border-primary-200'
                          }`}>
                            {desp.estado}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3" /> {formatDate(desp.fecha_despacho)}
                          <span className="mx-1">•</span>
                          {desp.tipo_envio === 'interno' ? 'ENTREGA PROPIA' : 'FLOTA EXTERNA'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/ordenes-venta/reportes/packlist/${desp.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-black/5 transition-all text-muted-foreground shadow-sm"
                      >
                        <Printer className="w-4 h-4" /> LISTA EMPAQUE
                      </Link>
                      <Link 
                        href={`/ordenes-venta/reportes/packlist/${desp.id}`}
                        target="_blank"
                        className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-200 transition-all active:scale-95"
                      >
                        <FileText className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>

                  {/* Cuerpo Ficha - Matriz de contenido */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Información de Envío</p>
                          <div className="space-y-1">
                            <p className="text-xs font-bold flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-primary-600" />
                              <span className="text-muted-foreground font-medium">Transporte:</span> {desp.transportadora || 'N/A'}
                            </p>
                            {desp.guia_seguimiento && (
                              <p className="text-xs font-bold flex items-center gap-2">
                                <ClipboardList className="w-3 h-3 text-primary-600" />
                                <span className="text-muted-foreground font-medium">Guía:</span> <span className="font-mono">{desp.guia_seguimiento}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-10">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Bultos/Cajas</p>
                          <p className="text-2xl font-black text-foreground leading-none">{desp.total_bultos}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Unidades</p>
                          <p className="text-2xl font-black text-primary-600 leading-none">{totalUds}</p>
                        </div>
                      </div>
                    </div>
                    
                    <BinMatrix items={desp.despacho_detalle} title="Contenido Detallado del Despacho" />

                    {desp.notas && (
                      <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-black/5">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Notas</p>
                        <p className="text-xs text-muted-foreground font-medium italic">{desp.notas}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Ficha - Enlaces rápidos */}
                  <div className="px-6 py-4 bg-black/[0.01] border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {desp.despacho_detalle && (
                        <div className="flex -space-x-2">
                          {[...new Set(desp.despacho_detalle.map((d: any) => d.bin_id))].map((binId: any, i) => (
                            <Link 
                              key={i} 
                              href={`/ordenes-venta/reportes/packlist/${desp.id}?binId=${binId}`}
                              target="_blank"
                              className="w-8 h-8 rounded-full bg-white border-2 border-primary-100 flex items-center justify-center text-[8px] font-black text-primary-600 shadow-sm hover:border-primary-400 hover:z-10 transition-all group/bin relative" 
                              title={`Imprimir Packing List Bin: ${binId}`}
                            >
                              <Printer className="w-2.5 h-2.5 absolute opacity-0 group-hover/bin:opacity-100 transition-opacity" />
                              <span className="group-hover/bin:opacity-0 transition-opacity">C{i+1}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Cajas incluidas en este despacho</p>
                    </div>
                    <Link 
                      href={`/tracker/${ovId}`} 
                      target="_blank"
                      className="inline-flex items-center gap-2 text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider group/link"
                    >
                      TRACKER CLIENTE <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
