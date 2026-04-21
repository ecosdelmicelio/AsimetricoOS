'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

interface RequerimientoMaterial {
  materialId: string
  nombre: string
  cantidadNeta: number
  proveedorId: string
  costoUnitario: number
}

/**
 * Ejecuta el motor MRP Lite para una Orden de Venta.
 * Explota el BOM, calcula faltantes considerando stock y seguridad,
 * y genera las Órdenes de Compra automáticas.
 */
export async function ejecutarMRPLite(ovId: string) {
  console.log('🚀 MRP Lite Triggered for OV:', ovId)
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  try {
    // 1. Obtener el detalle de la OV
    const { data: ovDetalle, error: ovError } = await supabase
      .from('ov_detalle')
      .select('producto_id, cantidad')
      .eq('ov_id', ovId)

    if (ovError || !ovDetalle || ovDetalle.length === 0) {
      console.warn('MRP: No hay detalle para la OV', ovId)
      return { success: false, message: 'No se encontró detalle en la OV' }
    }

    // 2. Explotar BOM y acumular requerimientos brutos
    const requerimientoBruto: Record<string, number> = {} // material_id -> cantidad acumulada
    const productoIds = Array.from(new Set(ovDetalle.map((d: any) => d.producto_id)))

    const { data: boms, error: bomError } = await supabase
      .from('bom')
      .select('producto_id, material_id, cantidad')
      .in('producto_id', productoIds)
      .eq('tipo', 'materia_prima')

    if (bomError) throw new Error(`Error al obtener BOMs: ${bomError.message}`)

    ovDetalle.forEach((ovLine: any) => {
      const productBom = boms?.filter((b: any) => b.producto_id === ovLine.producto_id) || []
      productBom.forEach((bomLine: any) => {
        const totalLineReq = ovLine.cantidad * bomLine.cantidad
        requerimientoBruto[bomLine.material_id] = (requerimientoBruto[bomLine.material_id] || 0) + totalLineReq
      })
    })

    const materialIds = Object.keys(requerimientoBruto)
    if (materialIds.length === 0) {
      return { success: true, message: 'La OV no requiere materiales (productos sin BOM)' }
    }

    // 3. Obtener información de materiales (Saldo, Seguridad, Proveedor)
    const { data: materiales, error: matError } = await supabase
      .from('materiales')
      .select('id, nombre, saldo, stock_seguridad, multiplo_compra, proveedor_id, costo_unit')
      .in('id', materialIds)

    if (matError) throw new Error(`Error al obtener materiales: ${matError.message}`)

    // 4. Calcular Déficit y agrupar por Proveedor
    const deficitPorProveedor: Record<string, RequerimientoMaterial[]> = {} // proveedor_id -> materiales[]

    materiales.forEach((mat: any) => {
      const bruto = requerimientoBruto[mat.id] || 0
      const seguridad = mat.stock_seguridad || 0
      const stockHijo = mat.saldo || 0 // Usamos el campo saldo de la tabla materiales que se mantiene via RPC
      
      const necesidadNeta = (bruto + seguridad) - stockHijo

      if (necesidadNeta > 0) {
        // Validar si tiene proveedor asignado
        if (!mat.proveedor_id) {
          console.warn(`MRP: El material ${mat.nombre} requiere compra pero no tiene proveedor asignado.`)
          return
        }

        // Aplicar Redondeo por Múltiplo
        let cantidadFinal = necesidadNeta
        if (mat.multiplo_compra && mat.multiplo_compra > 0) {
          cantidadFinal = Math.ceil(necesidadNeta / mat.multiplo_compra) * mat.multiplo_compra
        }

        if (!deficitPorProveedor[mat.proveedor_id]) {
          deficitPorProveedor[mat.proveedor_id] = []
        }

        deficitPorProveedor[mat.proveedor_id].push({
          materialId: mat.id,
          nombre: mat.nombre,
          cantidadNeta: cantidadFinal,
          proveedorId: mat.proveedor_id,
          costoUnitario: mat.costo_unit || 0
        })
      }
    })

    // 5. Crear Órdenes de Compra
    const ocCreadas: string[] = []
    const proveedoresIds = Object.keys(deficitPorProveedor)

    for (const provId of proveedoresIds) {
      const lineas = deficitPorProveedor[provId]
      
      // Crear Cabecera OC
      const { data: oc, error: ocError } = await supabase
        .from('ordenes_compra')
        .insert({
          proveedor_id: provId,
          orden_venta_id: ovId, // 🔗 Vinculación formal
          tipo: 'materia_prima',
          estado_greige: 'otros',
          estado_documental: 'na', // 📝 Creada en Borrador para decisión del comprador
          fecha_oc: new Date().toISOString().split('T')[0],
          fecha_entrega_est: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 días default
          notas: `Generada automáticamente por MRP - OV ${ovId}`,
          creado_por: user?.id ?? null
        })
        .select('id, codigo')
        .single() as { data: { id: string, codigo: string } | null, error: any }

      if (ocError || !oc) {
        console.error(`Error creando OC para proveedor ${provId}:`, ocError)
        continue
      }

      // Crear Líneas OC MP
      const ocLines = lineas.map(l => ({
        oc_id: oc.id,
        material_id: l.materialId,
        cantidad: l.cantidadNeta,
        precio_unitario: l.costoUnitario
      }))

      const { error: lineError } = await supabase
        .from('oc_detalle_mp')
        .insert(ocLines)

      if (lineError) {
        console.error(`Error creando líneas de OC ${oc.id}:`, lineError)
      } else {
        ocCreadas.push(oc.codigo)
      }
    }

    revalidatePath('/compras')
    
    if (ocCreadas.length > 0) {
      return {
        success: true,
        type: 'success',
        message: `Se generaron ${ocCreadas.length} sugerencias de compra (en borrador) vinculadas a esta OV.`,
        createdOcs: ocCreadas
      }
    }

    return {
      success: true,
      type: 'info',
      message: 'Inventario suficiente. No se requieren compras adicionales para esta orden.'
    }

  } catch (err) {
    console.error('MRP Critical Error:', err)
    return { success: false, type: 'error', message: (err as Error).message }
  }
}
