export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ajuste_items: {
        Row: {
          ajuste_id: string
          cantidad: number
          costo_unitario: number | null
          created_at: string | null
          id: string
          material_id: string | null
          producto_id: string | null
          talla: string | null
          unidad: string
        }
        Insert: {
          ajuste_id: string
          cantidad: number
          costo_unitario?: number | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          producto_id?: string | null
          talla?: string | null
          unidad?: string
        }
        Update: {
          ajuste_id?: string
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          producto_id?: string | null
          talla?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajuste_items_ajuste_id_fkey"
            columns: ["ajuste_id"]
            isOneToOne: false
            referencedRelation: "ajustes_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajuste_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajuste_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      ajustes_inventario: {
        Row: {
          bin_id: string
          bodega_id: string
          codigo: string
          created_at: string | null
          estado: string
          fecha_ajuste: string | null
          id: string
          notas: string
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          bin_id: string
          bodega_id: string
          codigo: string
          created_at?: string | null
          estado?: string
          fecha_ajuste?: string | null
          id?: string
          notas: string
          registrado_por?: string | null
          tipo: string
        }
        Update: {
          bin_id?: string
          bodega_id?: string
          codigo?: string
          created_at?: string | null
          estado?: string
          fecha_ajuste?: string | null
          id?: string
          notas?: string
          registrado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_inventario_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_inventario_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      atributos_mp: {
        Row: {
          abreviacion: string | null
          activo: boolean | null
          created_at: string | null
          id: string
          tipo: string
          valor: string
        }
        Insert: {
          abreviacion?: string | null
          activo?: boolean | null
          created_at?: string | null
          id?: string
          tipo: string
          valor: string
        }
        Update: {
          abreviacion?: string | null
          activo?: boolean | null
          created_at?: string | null
          id?: string
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      atributos_pt: {
        Row: {
          abreviacion: string | null
          activo: boolean | null
          created_at: string | null
          id: string
          tipo: string
          valor: string
        }
        Insert: {
          abreviacion?: string | null
          activo?: boolean | null
          created_at?: string | null
          id?: string
          tipo: string
          valor: string
        }
        Update: {
          abreviacion?: string | null
          activo?: boolean | null
          created_at?: string | null
          id?: string
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      bines: {
        Row: {
          bodega_id: string | null
          codigo: string
          created_at: string | null
          entrega_id: string | null
          es_fijo: boolean | null
          estado: string
          id: string
          posicion: string | null
          posicion_id: string | null
          tipo: string
        }
        Insert: {
          bodega_id?: string | null
          codigo: string
          created_at?: string | null
          entrega_id?: string | null
          es_fijo?: boolean | null
          estado?: string
          id?: string
          posicion?: string | null
          posicion_id?: string | null
          tipo: string
        }
        Update: {
          bodega_id?: string | null
          codigo?: string
          created_at?: string | null
          entrega_id?: string | null
          es_fijo?: boolean | null
          estado?: string
          id?: string
          posicion?: string | null
          posicion_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bines_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bines_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bines_posicion_id_fkey"
            columns: ["posicion_id"]
            isOneToOne: false
            referencedRelation: "bodega_posiciones"
            referencedColumns: ["id"]
          },
        ]
      }
      bodega_posiciones: {
        Row: {
          bodega_id: string
          capacidad_bines: number | null
          codigo: string
          created_at: string | null
          id: string
          nombre: string | null
          zona_id: string | null
        }
        Insert: {
          bodega_id: string
          capacidad_bines?: number | null
          codigo: string
          created_at?: string | null
          id?: string
          nombre?: string | null
          zona_id?: string | null
        }
        Update: {
          bodega_id?: string
          capacidad_bines?: number | null
          codigo?: string
          created_at?: string | null
          id?: string
          nombre?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bodega_posiciones_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bodega_posiciones_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "bodega_zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      bodega_zonas: {
        Row: {
          bodega_id: string
          codigo: string
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          bodega_id: string
          codigo: string
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          bodega_id?: string
          codigo?: string
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "bodega_zonas_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      bodegas: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          nombre: string
          tercero_id: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          nombre: string
          tercero_id?: string | null
          tipo: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          nombre?: string
          tercero_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bodegas_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      bom: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          material_id: string | null
          notas: string | null
          producto_id: string
          reportable_en_corte: boolean | null
          servicio_id: string | null
          tipo: string
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          id?: string
          material_id?: string | null
          notas?: string | null
          producto_id: string
          reportable_en_corte?: boolean | null
          servicio_id?: string | null
          tipo?: string
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          material_id?: string | null
          notas?: string | null
          producto_id?: string
          reportable_en_corte?: boolean | null
          servicio_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_operativos"
            referencedColumns: ["id"]
          },
        ]
      }
      calidad_config: {
        Row: {
          aql_nivel: string
          dupro_pct: number
          fri_metodo: string
          fri_pct: number
          id: string
          inspeccion_nivel: string
          updated_at: string | null
        }
        Insert: {
          aql_nivel?: string
          dupro_pct?: number
          fri_metodo?: string
          fri_pct?: number
          id?: string
          inspeccion_nivel?: string
          updated_at?: string | null
        }
        Update: {
          aql_nivel?: string
          dupro_pct?: number
          fri_metodo?: string
          fri_pct?: number
          id?: string
          inspeccion_nivel?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      codigo_schemas: {
        Row: {
          bloqueado: boolean | null
          created_at: string | null
          entidad: string
          finalizado: boolean
          id: string
          nombre: string
        }
        Insert: {
          bloqueado?: boolean | null
          created_at?: string | null
          entidad: string
          finalizado?: boolean
          id?: string
          nombre: string
        }
        Update: {
          bloqueado?: boolean | null
          created_at?: string | null
          entidad?: string
          finalizado?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      codigo_segmento_valores: {
        Row: {
          activo: boolean | null
          created_at: string | null
          etiqueta: string
          id: string
          segmento_id: string | null
          valor: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          etiqueta: string
          id?: string
          segmento_id?: string | null
          valor: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          etiqueta?: string
          id?: string
          segmento_id?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "codigo_segmento_valores_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "codigo_segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      codigo_segmentos: {
        Row: {
          clave: string
          etiqueta: string
          id: string
          longitud: number
          orden: number
          schema_id: string | null
          tipo: string
          ultimo_ref: number | null
        }
        Insert: {
          clave: string
          etiqueta: string
          id?: string
          longitud: number
          orden: number
          schema_id?: string | null
          tipo?: string
          ultimo_ref?: number | null
        }
        Update: {
          clave?: string
          etiqueta?: string
          id?: string
          longitud?: number
          orden?: number
          schema_id?: string | null
          tipo?: string
          ultimo_ref?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codigo_segmentos_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "codigo_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          created_at: string | null
          descripcion: string | null
          id: string
          tipo: string | null
          updated_at: string | null
          valor: string
        }
        Insert: {
          clave: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor: string
        }
        Update: {
          clave?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      desarrollo: {
        Row: {
          categoria_producto: string
          cliente_id: string | null
          complejidad: string
          creado_por: string | null
          created_at: string | null
          fecha_compromiso: string | null
          id: string
          nombre_proyecto: string
          notas: string | null
          prioridad: string
          producto_final_id: string | null
          status: string
          temp_id: string
          tipo_producto: string
          updated_at: string | null
        }
        Insert: {
          categoria_producto: string
          cliente_id?: string | null
          complejidad?: string
          creado_por?: string | null
          created_at?: string | null
          fecha_compromiso?: string | null
          id?: string
          nombre_proyecto: string
          notas?: string | null
          prioridad?: string
          producto_final_id?: string | null
          status?: string
          temp_id?: string
          tipo_producto: string
          updated_at?: string | null
        }
        Update: {
          categoria_producto?: string
          cliente_id?: string | null
          complejidad?: string
          creado_por?: string | null
          created_at?: string | null
          fecha_compromiso?: string | null
          id?: string
          nombre_proyecto?: string
          notas?: string | null
          prioridad?: string
          producto_final_id?: string | null
          status?: string
          temp_id?: string
          tipo_producto?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_producto_final_id_fkey"
            columns: ["producto_final_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_assets: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          tipo: string
          url: string
          version_id: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          tipo: string
          url: string
          version_id: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          tipo?: string
          url?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_assets_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "desarrollo_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_condiciones: {
        Row: {
          colores_disponibles: Json | null
          condiciones_pago: string | null
          created_at: string | null
          desarrollo_id: string
          empaque_minimo: string | null
          id: string
          incoterm: string | null
          leadtime_envio_dias: number | null
          leadtime_produccion_dias: number | null
          leadtime_total_dias: number | null
          moneda: string | null
          moq_producto: number | null
          moq_proveedor: number | null
          moq_unidad: string | null
          multiplo_orden: number | null
          notas: string | null
          precio_referencia: number | null
          proveedor_id: string | null
          puerto_origen: string | null
          tallas_disponibles: Json | null
          updated_at: string | null
          version_id: string | null
          vigencia_precio: string | null
        }
        Insert: {
          colores_disponibles?: Json | null
          condiciones_pago?: string | null
          created_at?: string | null
          desarrollo_id: string
          empaque_minimo?: string | null
          id?: string
          incoterm?: string | null
          leadtime_envio_dias?: number | null
          leadtime_produccion_dias?: number | null
          leadtime_total_dias?: number | null
          moneda?: string | null
          moq_producto?: number | null
          moq_proveedor?: number | null
          moq_unidad?: string | null
          multiplo_orden?: number | null
          notas?: string | null
          precio_referencia?: number | null
          proveedor_id?: string | null
          puerto_origen?: string | null
          tallas_disponibles?: Json | null
          updated_at?: string | null
          version_id?: string | null
          vigencia_precio?: string | null
        }
        Update: {
          colores_disponibles?: Json | null
          condiciones_pago?: string | null
          created_at?: string | null
          desarrollo_id?: string
          empaque_minimo?: string | null
          id?: string
          incoterm?: string | null
          leadtime_envio_dias?: number | null
          leadtime_produccion_dias?: number | null
          leadtime_total_dias?: number | null
          moneda?: string | null
          moq_producto?: number | null
          moq_proveedor?: number | null
          moq_unidad?: string | null
          multiplo_orden?: number | null
          notas?: string | null
          precio_referencia?: number | null
          proveedor_id?: string | null
          puerto_origen?: string | null
          tallas_disponibles?: Json | null
          updated_at?: string | null
          version_id?: string | null
          vigencia_precio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_condiciones_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_condiciones_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_condiciones_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "desarrollo_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_condiciones_material: {
        Row: {
          consumo_por_unidad: number | null
          created_at: string | null
          desarrollo_id: string
          id: string
          leadtime_material_dias: number | null
          material_id: string | null
          moq_implicito_producto: number | null
          moq_material: number | null
          moq_unidad: string | null
          notas: string | null
          proveedor_id: string | null
        }
        Insert: {
          consumo_por_unidad?: number | null
          created_at?: string | null
          desarrollo_id: string
          id?: string
          leadtime_material_dias?: number | null
          material_id?: string | null
          moq_implicito_producto?: number | null
          moq_material?: number | null
          moq_unidad?: string | null
          notas?: string | null
          proveedor_id?: string | null
        }
        Update: {
          consumo_por_unidad?: number | null
          created_at?: string | null
          desarrollo_id?: string
          id?: string
          leadtime_material_dias?: number | null
          material_id?: string | null
          moq_implicito_producto?: number | null
          moq_material?: number | null
          moq_unidad?: string | null
          notas?: string | null
          proveedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_condiciones_material_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_condiciones_material_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_condiciones_material_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_costos: {
        Row: {
          concepto: string
          created_at: string | null
          descripcion: string | null
          id: string
          monto: number
          version_id: string
        }
        Insert: {
          concepto: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          monto?: number
          version_id: string
        }
        Update: {
          concepto?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          monto?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_costos_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "desarrollo_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_hallazgos: {
        Row: {
          categoria: string
          created_at: string | null
          descripcion: string
          foto_url: string | null
          id: string
          resuelto: boolean | null
          resuelto_en_version: number | null
          severidad: string
          version_id: string
          zona_prenda: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          descripcion: string
          foto_url?: string | null
          id?: string
          resuelto?: boolean | null
          resuelto_en_version?: number | null
          severidad: string
          version_id: string
          zona_prenda?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          descripcion?: string
          foto_url?: string | null
          id?: string
          resuelto?: boolean | null
          resuelto_en_version?: number | null
          severidad?: string
          version_id?: string
          zona_prenda?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_hallazgos_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "desarrollo_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_ordenes: {
        Row: {
          created_at: string | null
          desarrollo_id: string
          estado: string | null
          id: string
          oc_id: string | null
          op_id: string | null
          tipo_orden: string
          version_id: string | null
        }
        Insert: {
          created_at?: string | null
          desarrollo_id: string
          estado?: string | null
          id?: string
          oc_id?: string | null
          op_id?: string | null
          tipo_orden: string
          version_id?: string | null
        }
        Update: {
          created_at?: string | null
          desarrollo_id?: string
          estado?: string | null
          id?: string
          oc_id?: string | null
          op_id?: string | null
          tipo_orden?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_ordenes_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_ordenes_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_ordenes_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_ordenes_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "desarrollo_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_transiciones: {
        Row: {
          created_at: string | null
          desarrollo_id: string
          duracion_fase_seg: number | null
          estado_anterior: string | null
          estado_nuevo: string
          id: string
          notas: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          desarrollo_id: string
          duracion_fase_seg?: number | null
          estado_anterior?: string | null
          estado_nuevo: string
          id?: string
          notas?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          desarrollo_id?: string
          duracion_fase_seg?: number | null
          estado_anterior?: string | null
          estado_nuevo?: string
          id?: string
          notas?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_transiciones_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_transiciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_versiones: {
        Row: {
          aprobado_cliente: boolean | null
          aprobado_director: boolean | null
          aprobado_ops: boolean | null
          bom_data: Json | null
          comportamiento_tela: string | null
          created_at: string | null
          cuadro_medidas: Json | null
          desarrollo_id: string
          id: string
          notas_version: string | null
          version_n: number
        }
        Insert: {
          aprobado_cliente?: boolean | null
          aprobado_director?: boolean | null
          aprobado_ops?: boolean | null
          bom_data?: Json | null
          comportamiento_tela?: string | null
          created_at?: string | null
          cuadro_medidas?: Json | null
          desarrollo_id: string
          id?: string
          notas_version?: string | null
          version_n?: number
        }
        Update: {
          aprobado_cliente?: boolean | null
          aprobado_director?: boolean | null
          aprobado_ops?: boolean | null
          bom_data?: Json | null
          comportamiento_tela?: string | null
          created_at?: string | null
          cuadro_medidas?: Json | null
          desarrollo_id?: string
          id?: string
          notas_version?: string | null
          version_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_versiones_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
        ]
      }
      desarrollo_viabilidad_ops: {
        Row: {
          capacidad_produccion: boolean | null
          condiciones_aprobacion: string | null
          created_at: string | null
          demanda_proyectada: number | null
          desarrollo_id: string
          evaluado_por: string | null
          id: string
          leadtime_aceptable: boolean | null
          materiales_disponibles: boolean | null
          moq_viable: boolean | null
          notas_ops: string | null
          proveedores_confirmados: boolean | null
          riesgo_abastecimiento: string | null
          veredicto: string | null
          version_id: string | null
        }
        Insert: {
          capacidad_produccion?: boolean | null
          condiciones_aprobacion?: string | null
          created_at?: string | null
          demanda_proyectada?: number | null
          desarrollo_id: string
          evaluado_por?: string | null
          id?: string
          leadtime_aceptable?: boolean | null
          materiales_disponibles?: boolean | null
          moq_viable?: boolean | null
          notas_ops?: string | null
          proveedores_confirmados?: boolean | null
          riesgo_abastecimiento?: string | null
          veredicto?: string | null
          version_id?: string | null
        }
        Update: {
          capacidad_produccion?: boolean | null
          condiciones_aprobacion?: string | null
          created_at?: string | null
          demanda_proyectada?: number | null
          desarrollo_id?: string
          evaluado_por?: string | null
          id?: string
          leadtime_aceptable?: boolean | null
          materiales_disponibles?: boolean | null
          moq_viable?: boolean | null
          notas_ops?: string | null
          proveedores_confirmados?: boolean | null
          riesgo_abastecimiento?: string | null
          veredicto?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrollo_viabilidad_ops_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_viabilidad_ops_evaluado_por_fkey"
            columns: ["evaluado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrollo_viabilidad_ops_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "desarrollo_versiones"
            referencedColumns: ["id"]
          },
        ]
      }
      despacho_detalle: {
        Row: {
          bin_id: string | null
          cantidad: number
          created_at: string | null
          despacho_id: string
          id: string
          producto_id: string
          talla: string
        }
        Insert: {
          bin_id?: string | null
          cantidad: number
          created_at?: string | null
          despacho_id: string
          id?: string
          producto_id: string
          talla: string
        }
        Update: {
          bin_id?: string | null
          cantidad?: number
          created_at?: string | null
          despacho_id?: string
          id?: string
          producto_id?: string
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "despacho_detalle_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despacho_detalle_despacho_id_fkey"
            columns: ["despacho_id"]
            isOneToOne: false
            referencedRelation: "despachos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despacho_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      despachos: {
        Row: {
          creado_por: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_despacho"] | null
          fecha_despacho: string | null
          guia_seguimiento: string | null
          id: string
          notas: string | null
          numero_despacho: number
          ov_id: string
          tipo_envio: Database["public"]["Enums"]["tipo_envio"] | null
          total_bultos: number | null
          transportadora: string | null
          updated_at: string | null
        }
        Insert: {
          creado_por?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_despacho"] | null
          fecha_despacho?: string | null
          guia_seguimiento?: string | null
          id?: string
          notas?: string | null
          numero_despacho?: number
          ov_id: string
          tipo_envio?: Database["public"]["Enums"]["tipo_envio"] | null
          total_bultos?: number | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Update: {
          creado_por?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_despacho"] | null
          fecha_despacho?: string | null
          guia_seguimiento?: string | null
          id?: string
          notas?: string | null
          numero_despacho?: number
          ov_id?: string
          tipo_envio?: Database["public"]["Enums"]["tipo_envio"] | null
          total_bultos?: number | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "despachos_ov_id_fkey"
            columns: ["ov_id"]
            isOneToOne: false
            referencedRelation: "ordenes_venta"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_detalle: {
        Row: {
          cantidad_entregada: number
          created_at: string | null
          entrega_id: string
          id: string
          producto_id: string
          talla: string
        }
        Insert: {
          cantidad_entregada: number
          created_at?: string | null
          entrega_id: string
          id?: string
          producto_id: string
          talla: string
        }
        Update: {
          cantidad_entregada?: number
          created_at?: string | null
          entrega_id?: string
          id?: string
          producto_id?: string
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_detalle_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          bin_codigo: string | null
          cantidad_cortada: number | null
          cantidad_entregada: number | null
          cantidad_faltante: number | null
          created_at: string | null
          es_faltante: boolean | null
          estado: string
          fecha_entrega: string
          id: string
          notas: string | null
          numero_entrega: number
          op_id: string
          reporte_corte_id: string | null
          updated_at: string | null
        }
        Insert: {
          bin_codigo?: string | null
          cantidad_cortada?: number | null
          cantidad_entregada?: number | null
          cantidad_faltante?: number | null
          created_at?: string | null
          es_faltante?: boolean | null
          estado?: string
          fecha_entrega?: string
          id?: string
          notas?: string | null
          numero_entrega: number
          op_id: string
          reporte_corte_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bin_codigo?: string | null
          cantidad_cortada?: number | null
          cantidad_entregada?: number | null
          cantidad_faltante?: number | null
          created_at?: string | null
          es_faltante?: boolean | null
          estado?: string
          fecha_entrega?: string
          id?: string
          notas?: string | null
          numero_entrega?: number
          op_id?: string
          reporte_corte_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_reporte_corte_id_fkey"
            columns: ["reporte_corte_id"]
            isOneToOne: false
            referencedRelation: "reporte_corte"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_estados: {
        Row: {
          cambiado_por: string | null
          entidad: string
          entidad_id: string
          estado_anterior: string | null
          estado_nuevo: string
          id: string
          notas: string | null
          timestamp_cambio: string
        }
        Insert: {
          cambiado_por?: string | null
          entidad: string
          entidad_id: string
          estado_anterior?: string | null
          estado_nuevo: string
          id?: string
          notas?: string | null
          timestamp_cambio?: string
        }
        Update: {
          cambiado_por?: string | null
          entidad?: string
          entidad_id?: string
          estado_anterior?: string | null
          estado_nuevo?: string
          id?: string
          notas?: string | null
          timestamp_cambio?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_estados_cambiado_por_fkey"
            columns: ["cambiado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hitos_produccion: {
        Row: {
          cantidad: number
          hito: string
          id: string
          notas: string | null
          op_id: string
          producto_id: string | null
          reportado_por: string | null
          talla: string | null
          timestamp_registro: string
        }
        Insert: {
          cantidad: number
          hito: string
          id?: string
          notas?: string | null
          op_id: string
          producto_id?: string | null
          reportado_por?: string | null
          talla?: string | null
          timestamp_registro?: string
        }
        Update: {
          cantidad?: number
          hito?: string
          id?: string
          notas?: string | null
          op_id?: string
          producto_id?: string | null
          reportado_por?: string | null
          talla?: string | null
          timestamp_registro?: string
        }
        Relationships: [
          {
            foreignKeyName: "hitos_produccion_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitos_produccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitos_produccion_reportado_por_fkey"
            columns: ["reportado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecciones: {
        Row: {
          cantidad_cortada: number | null
          cantidad_inspeccionada: number | null
          cantidad_segundas: number | null
          created_at: string | null
          entrega_id: string | null
          id: string
          inspector_id: string | null
          muestra_revisada: number | null
          notas: string | null
          op_id: string
          reporte_corte_id: string | null
          resultado: string
          timestamp_cierre: string | null
          timestamp_inicio: string | null
          tipo: string
        }
        Insert: {
          cantidad_cortada?: number | null
          cantidad_inspeccionada?: number | null
          cantidad_segundas?: number | null
          created_at?: string | null
          entrega_id?: string | null
          id?: string
          inspector_id?: string | null
          muestra_revisada?: number | null
          notas?: string | null
          op_id: string
          reporte_corte_id?: string | null
          resultado?: string
          timestamp_cierre?: string | null
          timestamp_inicio?: string | null
          tipo: string
        }
        Update: {
          cantidad_cortada?: number | null
          cantidad_inspeccionada?: number | null
          cantidad_segundas?: number | null
          created_at?: string | null
          entrega_id?: string | null
          id?: string
          inspector_id?: string | null
          muestra_revisada?: number | null
          notas?: string | null
          op_id?: string
          reporte_corte_id?: string | null
          resultado?: string
          timestamp_cierre?: string | null
          timestamp_inicio?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspecciones_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_reporte_corte_id_fkey"
            columns: ["reporte_corte_id"]
            isOneToOne: false
            referencedRelation: "reporte_corte"
            referencedColumns: ["id"]
          },
        ]
      }
      kardex: {
        Row: {
          bin_id: string | null
          bodega_id: string
          cantidad: number
          costo_total: number | null
          costo_unitario: number | null
          created_at: string | null
          documento_id: string | null
          documento_tipo: string | null
          fecha_movimiento: string | null
          id: string
          material_id: string | null
          notas: string | null
          oc_id: string | null
          ov_id: string | null
          producto_id: string | null
          registrado_por: string | null
          saldo_ponderado: number | null
          talla: string | null
          tipo_movimiento_id: string
          unidad: string
        }
        Insert: {
          bin_id?: string | null
          bodega_id: string
          cantidad: number
          costo_total?: number | null
          costo_unitario?: number | null
          created_at?: string | null
          documento_id?: string | null
          documento_tipo?: string | null
          fecha_movimiento?: string | null
          id?: string
          material_id?: string | null
          notas?: string | null
          oc_id?: string | null
          ov_id?: string | null
          producto_id?: string | null
          registrado_por?: string | null
          saldo_ponderado?: number | null
          talla?: string | null
          tipo_movimiento_id: string
          unidad: string
        }
        Update: {
          bin_id?: string | null
          bodega_id?: string
          cantidad?: number
          costo_total?: number | null
          costo_unitario?: number | null
          created_at?: string | null
          documento_id?: string | null
          documento_tipo?: string | null
          fecha_movimiento?: string | null
          id?: string
          material_id?: string | null
          notas?: string | null
          oc_id?: string | null
          ov_id?: string | null
          producto_id?: string | null
          registrado_por?: string | null
          saldo_ponderado?: number | null
          talla?: string | null
          tipo_movimiento_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "kardex_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_ov_id_fkey"
            columns: ["ov_id"]
            isOneToOne: false
            referencedRelation: "ordenes_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_tipo_movimiento_id_fkey"
            columns: ["tipo_movimiento_id"]
            isOneToOne: false
            referencedRelation: "kardex_tipos_movimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      kardex_tipos_movimiento: {
        Row: {
          activo: boolean | null
          categoria: string
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      liquidacion_op: {
        Row: {
          aprobado_por: string | null
          cantidad_entregada: number
          costo_insumos: number
          costo_servicios: number
          costo_tela: number
          costo_total: number
          cpp: number | null
          created_at: string | null
          estado: string
          fecha_aprobacion: string | null
          id: string
          op_id: string
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          cantidad_entregada?: number
          costo_insumos?: number
          costo_servicios?: number
          costo_tela?: number
          costo_total?: number
          cpp?: number | null
          created_at?: string | null
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          op_id: string
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          cantidad_entregada?: number
          costo_insumos?: number
          costo_servicios?: number
          costo_tela?: number
          costo_total?: number
          cpp?: number | null
          created_at?: string | null
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          op_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_op_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: true
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacion_servicios_ref: {
        Row: {
          cantidad: number
          costo_total: number | null
          created_at: string | null
          id: string
          nombre_servicio: string
          op_id: string
          producto_id: string
          tarifa_unitaria: number
          updated_at: string | null
        }
        Insert: {
          cantidad?: number
          costo_total?: number | null
          created_at?: string | null
          id?: string
          nombre_servicio: string
          op_id: string
          producto_id: string
          tarifa_unitaria?: number
          updated_at?: string | null
        }
        Update: {
          cantidad?: number
          costo_total?: number | null
          created_at?: string | null
          id?: string
          nombre_servicio?: string
          op_id?: string
          producto_id?: string
          tarifa_unitaria?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_servicios_ref_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_servicios_ref_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidaciones: {
        Row: {
          aprobado_por: string | null
          costo_servicio_taller: number
          costo_total: number | null
          costo_unitario_final: number | null
          created_at: string | null
          entrega_id: string | null
          estado: string
          fecha_aprobacion: string | null
          id: string
          notas: string | null
          op_id: string
          penalidades_calidad: number
          unidades_aprobadas: number
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          costo_servicio_taller?: number
          costo_total?: number | null
          costo_unitario_final?: number | null
          created_at?: string | null
          entrega_id?: string | null
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          notas?: string | null
          op_id: string
          penalidades_calidad?: number
          unidades_aprobadas?: number
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          costo_servicio_taller?: number
          costo_total?: number | null
          costo_unitario_final?: number | null
          created_at?: string | null
          entrega_id?: string | null
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          notas?: string | null
          op_id?: string
          penalidades_calidad?: number
          unidades_aprobadas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: true
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre: string
          tercero_id: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre: string
          tercero_id?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre?: string
          tercero_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marcas_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      material_atributos: {
        Row: {
          atributo_id: string
          material_id: string
          tipo: string
        }
        Insert: {
          atributo_id: string
          material_id: string
          tipo: string
        }
        Update: {
          atributo_id?: string
          material_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_atributos_atributo_id_fkey"
            columns: ["atributo_id"]
            isOneToOne: false
            referencedRelation: "atributos_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_atributos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
        ]
      }
      materiales: {
        Row: {
          activo: boolean
          codigo: string
          costo_unit: number
          created_at: string | null
          es_tela: boolean | null
          id: string
          nombre: string
          partida_arancelaria: string | null
          referencia_proveedor: string | null
          rendimiento_kg: number | null
          saldo: number | null
          schema_id: string | null
          tipo_mp: string | null
          unidad: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          costo_unit?: number
          created_at?: string | null
          es_tela?: boolean | null
          id?: string
          nombre: string
          partida_arancelaria?: string | null
          referencia_proveedor?: string | null
          rendimiento_kg?: number | null
          saldo?: number | null
          schema_id?: string | null
          tipo_mp?: string | null
          unidad?: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          costo_unit?: number
          created_at?: string | null
          es_tela?: boolean | null
          id?: string
          nombre?: string
          partida_arancelaria?: string | null
          referencia_proveedor?: string | null
          rendimiento_kg?: number | null
          saldo?: number | null
          schema_id?: string | null
          tipo_mp?: string | null
          unidad?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiales_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "codigo_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades_calidad: {
        Row: {
          cantidad_afectada: number
          descripcion: string | null
          foto_url: string | null
          gravedad: string
          id: string
          inspeccion_id: string
          timestamp_registro: string | null
          tipo_defecto_id: string | null
        }
        Insert: {
          cantidad_afectada?: number
          descripcion?: string | null
          foto_url?: string | null
          gravedad: string
          id?: string
          inspeccion_id: string
          timestamp_registro?: string | null
          tipo_defecto_id?: string | null
        }
        Update: {
          cantidad_afectada?: number
          descripcion?: string | null
          foto_url?: string | null
          gravedad?: string
          id?: string
          inspeccion_id?: string
          timestamp_registro?: string | null
          tipo_defecto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "novedades_calidad_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspecciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novedades_calidad_tipo_defecto_id_fkey"
            columns: ["tipo_defecto_id"]
            isOneToOne: false
            referencedRelation: "tipos_defecto"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_detalle: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          oc_id: string
          precio_pactado: number
          precio_unitario: number | null
          producto_id: string
          talla: string
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          id?: string
          oc_id: string
          precio_pactado?: number
          precio_unitario?: number | null
          producto_id: string
          talla: string
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          oc_id?: string
          precio_pactado?: number
          precio_unitario?: number | null
          producto_id?: string
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_detalle_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_detalle_mp: {
        Row: {
          cantidad: number
          cantidad_esperada: number | null
          created_at: string | null
          id: string
          material_id: string
          notas: string | null
          oc_id: string
          precio_unitario: number
        }
        Insert: {
          cantidad: number
          cantidad_esperada?: number | null
          created_at?: string | null
          id?: string
          material_id: string
          notas?: string | null
          oc_id: string
          precio_unitario?: number
        }
        Update: {
          cantidad?: number
          cantidad_esperada?: number | null
          created_at?: string | null
          id?: string
          material_id?: string
          notas?: string | null
          oc_id?: string
          precio_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "oc_detalle_mp_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_detalle_mp_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      op_detalle: {
        Row: {
          cantidad_asignada: number
          created_at: string | null
          id: string
          op_id: string
          producto_id: string
          talla: string
        }
        Insert: {
          cantidad_asignada: number
          created_at?: string | null
          id?: string
          op_id: string
          producto_id: string
          talla: string
        }
        Update: {
          cantidad_asignada?: number
          created_at?: string | null
          id?: string
          op_id?: string
          producto_id?: string
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_detalle_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      op_servicios: {
        Row: {
          cantidad_por_unidad: number
          created_at: string | null
          id: string
          op_id: string
          servicio_id: string
          tarifa_unitaria: number
        }
        Insert: {
          cantidad_por_unidad?: number
          created_at?: string | null
          id?: string
          op_id: string
          servicio_id: string
          tarifa_unitaria: number
        }
        Update: {
          cantidad_por_unidad?: number
          created_at?: string | null
          id?: string
          op_id?: string
          servicio_id?: string
          tarifa_unitaria?: number
        }
        Relationships: [
          {
            foreignKeyName: "op_servicios_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_operativos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          codigo: string
          creado_por: string | null
          created_at: string
          desarrollo_id: string | null
          es_muestra: boolean | null
          estado_documental: string
          estado_greige: string
          fecha_entrega_est: string
          fecha_oc: string
          id: string
          notas: string | null
          proveedor_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          codigo?: string
          creado_por?: string | null
          created_at?: string
          desarrollo_id?: string | null
          es_muestra?: boolean | null
          estado_documental?: string
          estado_greige?: string
          fecha_entrega_est: string
          fecha_oc?: string
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          creado_por?: string | null
          created_at?: string
          desarrollo_id?: string | null
          es_muestra?: boolean | null
          estado_documental?: string
          estado_greige?: string
          fecha_entrega_est?: string
          fecha_oc?: string
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_produccion: {
        Row: {
          bin_destino_codigo: string | null
          bodega_destino_id: string | null
          bodega_taller_id: string | null
          codigo: string
          creado_por: string | null
          created_at: string | null
          desarrollo_id: string | null
          es_muestra: boolean | null
          estado: string
          fecha_promesa: string
          id: string
          notas: string | null
          ov_id: string
          taller_id: string
          updated_at: string | null
        }
        Insert: {
          bin_destino_codigo?: string | null
          bodega_destino_id?: string | null
          bodega_taller_id?: string | null
          codigo?: string
          creado_por?: string | null
          created_at?: string | null
          desarrollo_id?: string | null
          es_muestra?: boolean | null
          estado?: string
          fecha_promesa: string
          id?: string
          notas?: string | null
          ov_id: string
          taller_id: string
          updated_at?: string | null
        }
        Update: {
          bin_destino_codigo?: string | null
          bodega_destino_id?: string | null
          bodega_taller_id?: string | null
          codigo?: string
          creado_por?: string | null
          created_at?: string | null
          desarrollo_id?: string | null
          es_muestra?: boolean | null
          estado?: string
          fecha_promesa?: string
          id?: string
          notas?: string | null
          ov_id?: string
          taller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_produccion_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_bodega_taller_id_fkey"
            columns: ["bodega_taller_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_desarrollo_id_fkey"
            columns: ["desarrollo_id"]
            isOneToOne: false
            referencedRelation: "desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_ov_id_fkey"
            columns: ["ov_id"]
            isOneToOne: false
            referencedRelation: "ordenes_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_venta: {
        Row: {
          cliente_id: string
          codigo: string
          creado_por: string | null
          created_at: string | null
          estado: string
          fecha_entrega: string
          fecha_pedido: string
          id: string
          notas: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          codigo?: string
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_entrega: string
          fecha_pedido?: string
          id?: string
          notas?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          codigo?: string
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_entrega?: string
          fecha_pedido?: string
          id?: string
          notas?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_venta_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ov_detalle: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          ov_id: string
          precio_pactado: number
          producto_id: string
          talla: string
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: string
          ov_id: string
          precio_pactado: number
          producto_id: string
          talla: string
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          ov_id?: string
          precio_pactado?: number
          producto_id?: string
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "ov_detalle_ov_id_fkey"
            columns: ["ov_id"]
            isOneToOne: false
            referencedRelation: "ordenes_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ov_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_atributos: {
        Row: {
          atributo_id: string
          producto_id: string
          tipo: string
        }
        Insert: {
          atributo_id: string
          producto_id: string
          tipo: string
        }
        Update: {
          atributo_id?: string
          producto_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_atributos_atributo_id_fkey"
            columns: ["atributo_id"]
            isOneToOne: false
            referencedRelation: "atributos_pt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_atributos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_condiciones: {
        Row: {
          activo: boolean | null
          colores_disponibles: Json | null
          condiciones_pago: string | null
          created_at: string | null
          empaque_minimo: string | null
          id: string
          incoterm: string | null
          leadtime_envio_dias: number | null
          leadtime_produccion_dias: number | null
          moneda: string | null
          moq_proveedor: number | null
          moq_unidad: string | null
          precio_negociado: number | null
          producto_id: string
          proveedor_id: string | null
          puerto_origen: string | null
          tallas_disponibles: Json | null
          updated_at: string | null
          vigencia_precio: string | null
        }
        Insert: {
          activo?: boolean | null
          colores_disponibles?: Json | null
          condiciones_pago?: string | null
          created_at?: string | null
          empaque_minimo?: string | null
          id?: string
          incoterm?: string | null
          leadtime_envio_dias?: number | null
          leadtime_produccion_dias?: number | null
          moneda?: string | null
          moq_proveedor?: number | null
          moq_unidad?: string | null
          precio_negociado?: number | null
          producto_id: string
          proveedor_id?: string | null
          puerto_origen?: string | null
          tallas_disponibles?: Json | null
          updated_at?: string | null
          vigencia_precio?: string | null
        }
        Update: {
          activo?: boolean | null
          colores_disponibles?: Json | null
          condiciones_pago?: string | null
          created_at?: string | null
          empaque_minimo?: string | null
          id?: string
          incoterm?: string | null
          leadtime_envio_dias?: number | null
          leadtime_produccion_dias?: number | null
          moneda?: string | null
          moq_proveedor?: number | null
          moq_unidad?: string | null
          precio_negociado?: number | null
          producto_id?: string
          proveedor_id?: string | null
          puerto_origen?: string | null
          tallas_disponibles?: Json | null
          updated_at?: string | null
          vigencia_precio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_condiciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_condiciones_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          bom_completo: boolean | null
          categoria: string
          color: string | null
          created_at: string | null
          estado: string
          id: string
          leadtime_dias: number | null
          marca_id: string | null
          minimo_orden: number | null
          multiplo_orden: number | null
          nombre: string
          nombre_comercial: string | null
          origen_usa: boolean
          precio_base: number | null
          precio_estandar: number | null
          precio_n3: number | null
          referencia: string
          referencia_cliente: string | null
          schema_id: string | null
          tallas: string[] | null
          tipo_distribucion: string | null
          tipo_producto: string | null
          updated_at: string | null
        }
        Insert: {
          bom_completo?: boolean | null
          categoria: string
          color?: string | null
          created_at?: string | null
          estado?: string
          id?: string
          leadtime_dias?: number | null
          marca_id?: string | null
          minimo_orden?: number | null
          multiplo_orden?: number | null
          nombre: string
          nombre_comercial?: string | null
          origen_usa?: boolean
          precio_base?: number | null
          precio_estandar?: number | null
          precio_n3?: number | null
          referencia: string
          referencia_cliente?: string | null
          schema_id?: string | null
          tallas?: string[] | null
          tipo_distribucion?: string | null
          tipo_producto?: string | null
          updated_at?: string | null
        }
        Update: {
          bom_completo?: boolean | null
          categoria?: string
          color?: string | null
          created_at?: string | null
          estado?: string
          id?: string
          leadtime_dias?: number | null
          marca_id?: string | null
          minimo_orden?: number | null
          multiplo_orden?: number | null
          nombre?: string
          nombre_comercial?: string | null
          origen_usa?: boolean
          precio_base?: number | null
          precio_estandar?: number | null
          precio_n3?: number | null
          referencia?: string
          referencia_cliente?: string | null
          schema_id?: string | null
          tallas?: string[] | null
          tipo_distribucion?: string | null
          tipo_producto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "codigo_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          role: string
          taller_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          role: string
          taller_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          role?: string
          taller_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      recepcion_oc: {
        Row: {
          bin_id: string | null
          cantidad_esperada: number | null
          cantidad_recibida: number
          costo_total: number | null
          created_at: string | null
          estado: string | null
          fecha_recepcion: string | null
          id: string
          material_id: string | null
          notas: string | null
          oc_id: string
          precio_unitario: number | null
          producto_id: string | null
          recibido_por: string | null
          talla: string | null
        }
        Insert: {
          bin_id?: string | null
          cantidad_esperada?: number | null
          cantidad_recibida: number
          costo_total?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_recepcion?: string | null
          id?: string
          material_id?: string | null
          notas?: string | null
          oc_id: string
          precio_unitario?: number | null
          producto_id?: string | null
          recibido_por?: string | null
          talla?: string | null
        }
        Update: {
          bin_id?: string | null
          cantidad_esperada?: number | null
          cantidad_recibida?: number
          costo_total?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_recepcion?: string | null
          id?: string
          material_id?: string | null
          notas?: string | null
          oc_id?: string
          precio_unitario?: number | null
          producto_id?: string | null
          recibido_por?: string | null
          talla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recepcion_oc_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepcion_oc_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepcion_oc_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepcion_oc_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepcion_oc_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_corte: {
        Row: {
          cantidad_total_cortada: number | null
          created_at: string | null
          enviado_a_confeccion: boolean | null
          fecha: string
          id: string
          notas: string | null
          op_id: string
          orden: number | null
          reportado_por: string | null
        }
        Insert: {
          cantidad_total_cortada?: number | null
          created_at?: string | null
          enviado_a_confeccion?: boolean | null
          fecha?: string
          id?: string
          notas?: string | null
          op_id: string
          orden?: number | null
          reportado_por?: string | null
        }
        Update: {
          cantidad_total_cortada?: number | null
          created_at?: string | null
          enviado_a_confeccion?: boolean | null
          fecha?: string
          id?: string
          notas?: string | null
          op_id?: string
          orden?: number | null
          reportado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_corte_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_corte_reportado_por_fkey"
            columns: ["reportado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_corte_corte: {
        Row: {
          color: string
          created_at: string | null
          id: string
          metros_usados: number
          peso_desperdicio_kg: number
          reporte_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          metros_usados: number
          peso_desperdicio_kg?: number
          reporte_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          metros_usados?: number
          peso_desperdicio_kg?: number
          reporte_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporte_corte_tendido_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "reporte_corte"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_corte_linea: {
        Row: {
          cantidad_cortada: number
          color: string | null
          created_at: string | null
          desperdicio_kg: number | null
          id: string
          material_devuelto_kg: number | null
          material_id: string | null
          metros_usados: number | null
          producto_id: string
          talla: string
          tendido_id: string
        }
        Insert: {
          cantidad_cortada: number
          color?: string | null
          created_at?: string | null
          desperdicio_kg?: number | null
          id?: string
          material_devuelto_kg?: number | null
          material_id?: string | null
          metros_usados?: number | null
          producto_id: string
          talla: string
          tendido_id: string
        }
        Update: {
          cantidad_cortada?: number
          color?: string | null
          created_at?: string | null
          desperdicio_kg?: number | null
          id?: string
          material_devuelto_kg?: number | null
          material_id?: string | null
          metros_usados?: number | null
          producto_id?: string
          talla?: string
          tendido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporte_corte_linea_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_corte_linea_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_corte_linea_tendido_id_fkey"
            columns: ["tendido_id"]
            isOneToOne: false
            referencedRelation: "reporte_corte_corte"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_corte_material: {
        Row: {
          cantidad_cortada_total: number | null
          created_at: string | null
          desperdicio_kg: number
          id: string
          material_devuelto_kg: number
          material_id: string
          metros_usados: number
          reporte_id: string
        }
        Insert: {
          cantidad_cortada_total?: number | null
          created_at?: string | null
          desperdicio_kg?: number
          id?: string
          material_devuelto_kg?: number
          material_id: string
          metros_usados: number
          reporte_id: string
        }
        Update: {
          cantidad_cortada_total?: number | null
          created_at?: string | null
          desperdicio_kg?: number
          id?: string
          material_devuelto_kg?: number
          material_id?: string
          metros_usados?: number
          reporte_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporte_corte_material_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_corte_material_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "reporte_corte"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_insumos: {
        Row: {
          cantidad_usada: number
          created_at: string | null
          desperdicio: number
          id: string
          material_id: string
          notas: string | null
          op_id: string
          producto_id: string | null
          reportado_por: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad_usada?: number
          created_at?: string | null
          desperdicio?: number
          id?: string
          material_id: string
          notas?: string | null
          op_id: string
          producto_id?: string | null
          reportado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad_usada?: number
          created_at?: string | null
          desperdicio?: number
          id?: string
          material_id?: string
          notas?: string | null
          op_id?: string
          producto_id?: string | null
          reportado_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_insumos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_insumos_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_insumos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      rollos: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notas: string | null
          oc_id: string
          peso_real_kg: number
          rendimiento_real: number | null
          saldo_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notas?: string | null
          oc_id: string
          peso_real_kg: number
          rendimiento_real?: number | null
          saldo_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notas?: string | null
          oc_id?: string
          peso_real_kg?: number
          rendimiento_real?: number | null
          saldo_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "rollos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollos_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_operativos: {
        Row: {
          activo: boolean
          atributo1_id: string | null
          atributo2_id: string | null
          atributo3_id: string | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          ejecutor_id: string | null
          id: string
          nombre: string
          schema_id: string | null
          tarifa_unitaria: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          atributo1_id?: string | null
          atributo2_id?: string | null
          atributo3_id?: string | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          ejecutor_id?: string | null
          id?: string
          nombre: string
          schema_id?: string | null
          tarifa_unitaria?: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          atributo1_id?: string | null
          atributo2_id?: string | null
          atributo3_id?: string | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          ejecutor_id?: string | null
          id?: string
          nombre?: string
          schema_id?: string | null
          tarifa_unitaria?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_operativos_atributo1_id_fkey"
            columns: ["atributo1_id"]
            isOneToOne: false
            referencedRelation: "tipo_servicio_atributos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_operativos_atributo2_id_fkey"
            columns: ["atributo2_id"]
            isOneToOne: false
            referencedRelation: "tipo_servicio_atributos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_operativos_atributo3_id_fkey"
            columns: ["atributo3_id"]
            isOneToOne: false
            referencedRelation: "tipo_servicio_atributos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_operativos_ejecutor_id_fkey"
            columns: ["ejecutor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_operativos_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "codigo_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      tercero_contactos: {
        Row: {
          activo: boolean | null
          categoria: string
          celular: string | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string
          tercero_id: string
        }
        Insert: {
          activo?: boolean | null
          categoria?: string
          celular?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre: string
          tercero_id: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          celular?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string
          tercero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tercero_contactos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      tercero_direcciones: {
        Row: {
          activa: boolean | null
          ciudad: string | null
          created_at: string | null
          direccion: string
          id: string
          nombre: string
          tercero_id: string
        }
        Insert: {
          activa?: boolean | null
          ciudad?: string | null
          created_at?: string | null
          direccion: string
          id?: string
          nombre: string
          tercero_id: string
        }
        Update: {
          activa?: boolean | null
          ciudad?: string | null
          created_at?: string | null
          direccion?: string
          id?: string
          nombre?: string
          tercero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tercero_direcciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      terceros: {
        Row: {
          bodega_taller_id: string | null
          calificacion: number | null
          capacidad_diaria: number | null
          created_at: string
          descuento_pago_anticipado: number | null
          direccion: string | null
          email: string | null
          email_facturacion: string | null
          estado: string
          id: string
          lead_time_dias: number | null
          nit: string | null
          nombre: string
          porcentaje_anticipo: number | null
          telefono: string | null
          tipos: string[]
          updated_at: string
          valor_servicio_ref: number | null
        }
        Insert: {
          bodega_taller_id?: string | null
          calificacion?: number | null
          capacidad_diaria?: number | null
          created_at?: string
          descuento_pago_anticipado?: number | null
          direccion?: string | null
          email?: string | null
          email_facturacion?: string | null
          estado?: string
          id?: string
          lead_time_dias?: number | null
          nit?: string | null
          nombre: string
          porcentaje_anticipo?: number | null
          telefono?: string | null
          tipos?: string[]
          updated_at?: string
          valor_servicio_ref?: number | null
        }
        Update: {
          bodega_taller_id?: string | null
          calificacion?: number | null
          capacidad_diaria?: number | null
          created_at?: string
          descuento_pago_anticipado?: number | null
          direccion?: string | null
          email?: string | null
          email_facturacion?: string | null
          estado?: string
          id?: string
          lead_time_dias?: number | null
          nit?: string | null
          nombre?: string
          porcentaje_anticipo?: number | null
          telefono?: string | null
          tipos?: string[]
          updated_at?: string
          valor_servicio_ref?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "terceros_bodega_taller_id_fkey"
            columns: ["bodega_taller_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_servicio_atributos: {
        Row: {
          abreviatura: string
          activo: boolean | null
          atributo_tipo: string
          created_at: string | null
          id: string
          nombre: string
          subtipo_padre_id: string | null
          tipo_padre_id: string | null
        }
        Insert: {
          abreviatura: string
          activo?: boolean | null
          atributo_tipo: string
          created_at?: string | null
          id?: string
          nombre: string
          subtipo_padre_id?: string | null
          tipo_padre_id?: string | null
        }
        Update: {
          abreviatura?: string
          activo?: boolean | null
          atributo_tipo?: string
          created_at?: string | null
          id?: string
          nombre?: string
          subtipo_padre_id?: string | null
          tipo_padre_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipo_servicio_atributos_subtipo_padre_id_fkey"
            columns: ["subtipo_padre_id"]
            isOneToOne: false
            referencedRelation: "tipo_servicio_atributos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipo_servicio_atributos_tipo_padre_id_fkey"
            columns: ["tipo_padre_id"]
            isOneToOne: false
            referencedRelation: "tipo_servicio_atributos"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_defecto: {
        Row: {
          activo: boolean | null
          categoria: string
          codigo: string
          created_at: string | null
          descripcion: string
          gravedad_sugerida: string
          id: string
          puntos_penalidad: number
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          codigo: string
          created_at?: string | null
          descripcion: string
          gravedad_sugerida: string
          id?: string
          puntos_penalidad?: number
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          codigo?: string
          created_at?: string | null
          descripcion?: string
          gravedad_sugerida?: string
          id?: string
          puntos_penalidad?: number
        }
        Relationships: []
      }
      traslado_items: {
        Row: {
          bin_id: string | null
          cantidad: number
          costo_unitario: number | null
          created_at: string | null
          id: string
          material_id: string | null
          producto_id: string | null
          talla: string | null
          traslado_id: string
          unidad: string
        }
        Insert: {
          bin_id?: string | null
          cantidad: number
          costo_unitario?: number | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          producto_id?: string | null
          talla?: string | null
          traslado_id: string
          unidad: string
        }
        Update: {
          bin_id?: string | null
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string | null
          id?: string
          material_id?: string | null
          producto_id?: string | null
          talla?: string | null
          traslado_id?: string
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslado_items_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_items_traslado_id_fkey"
            columns: ["traslado_id"]
            isOneToOne: false
            referencedRelation: "traslados"
            referencedColumns: ["id"]
          },
        ]
      }
      traslados: {
        Row: {
          bin_destino_id: string | null
          bin_origen_id: string | null
          bodega_destino: string
          bodega_origen: string
          codigo: string
          created_at: string | null
          estado: string
          fecha_traslado: string | null
          id: string
          notas: string | null
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          bin_destino_id?: string | null
          bin_origen_id?: string | null
          bodega_destino: string
          bodega_origen: string
          codigo: string
          created_at?: string | null
          estado?: string
          fecha_traslado?: string | null
          id?: string
          notas?: string | null
          registrado_por?: string | null
          tipo?: string
        }
        Update: {
          bin_destino_id?: string | null
          bin_origen_id?: string | null
          bodega_destino?: string
          bodega_origen?: string
          codigo?: string
          created_at?: string | null
          estado?: string
          fecha_traslado?: string | null
          id?: string
          notas?: string | null
          registrado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslados_bin_destino_id_fkey"
            columns: ["bin_destino_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_bin_origen_id_fkey"
            columns: ["bin_origen_id"]
            isOneToOne: false
            referencedRelation: "bines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_bodega_destino_fkey"
            columns: ["bodega_destino"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_bodega_origen_fkey"
            columns: ["bodega_origen"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actualizar_saldo_material: {
        Args: { p_cantidad: number; p_material_id: string }
        Returns: undefined
      }
      generate_desarrollo_temp_id: { Args: never; Returns: string }
      generate_op_codigo: { Args: never; Returns: string }
      generate_ov_codigo: { Args: never; Returns: string }
      get_auth_uid_safe: { Args: never; Returns: string }
      get_saldos_por_bin: {
        Args: { p_bodega_id?: string }
        Returns: {
          bin_codigo: string
          bin_id: string
          bodega_id: string
          bodega_nombre: string
          costo_promedio: number
          nombre: string
          producto_id: string
          referencia: string
          saldo: number
          talla: string
          valor_total: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_user_taller_id: { Args: never; Returns: string }
      next_ref_numero: { Args: { p_segmento_id: string }; Returns: number }
    }
    Enums: {
      estado_despacho: "preparacion" | "enviado" | "entregado" | "cancelado"
      tipo_envio: "interno" | "externo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_despacho: ["preparacion", "enviado", "entregado", "cancelado"],
      tipo_envio: ["interno", "externo"],
    },
  },
} as const
