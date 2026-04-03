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
      clientes: {
        Row: {
          created_at: string | null
          email: string | null
          estado: string
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
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
          created_at: string | null
          id: string
          inspector_id: string | null
          muestra_revisada: number | null
          notas: string | null
          op_id: string
          resultado: string
          timestamp_cierre: string | null
          timestamp_inicio: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspector_id?: string | null
          muestra_revisada?: number | null
          notas?: string | null
          op_id: string
          resultado?: string
          timestamp_cierre?: string | null
          timestamp_inicio?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inspector_id?: string | null
          muestra_revisada?: number | null
          notas?: string | null
          op_id?: string
          resultado?: string
          timestamp_cierre?: string | null
          timestamp_inicio?: string | null
          tipo?: string
        }
        Relationships: [
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
        ]
      }
      liquidaciones: {
        Row: {
          aprobado_por: string | null
          costo_servicio_taller: number
          costo_total: number | null
          costo_unitario_final: number | null
          created_at: string | null
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
            foreignKeyName: "liquidaciones_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: true
            referencedRelation: "ordenes_produccion"
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
      ordenes_produccion: {
        Row: {
          codigo: string
          creado_por: string | null
          created_at: string | null
          estado: string
          fecha_promesa: string
          id: string
          notas: string | null
          ov_id: string
          taller_id: string
          updated_at: string | null
        }
        Insert: {
          codigo?: string
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_promesa: string
          id?: string
          notas?: string | null
          ov_id: string
          taller_id: string
          updated_at?: string | null
        }
        Update: {
          codigo?: string
          creado_por?: string | null
          created_at?: string | null
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
            foreignKeyName: "ordenes_produccion_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "talleres"
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
            referencedRelation: "clientes"
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
      productos: {
        Row: {
          categoria: string
          created_at: string | null
          estado: string
          id: string
          nombre: string
          precio_base: number | null
          referencia: string
          updated_at: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          estado?: string
          id?: string
          nombre: string
          precio_base?: number | null
          referencia: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          estado?: string
          id?: string
          nombre?: string
          precio_base?: number | null
          referencia?: string
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
        ]
      }
      talleres: {
        Row: {
          capacidad_diaria: number | null
          created_at: string | null
          estado: string
          id: string
          lead_time_dias: number | null
          nombre: string
          updated_at: string | null
        }
        Insert: {
          capacidad_diaria?: number | null
          created_at?: string | null
          estado?: string
          id?: string
          lead_time_dias?: number | null
          nombre: string
          updated_at?: string | null
        }
        Update: {
          capacidad_diaria?: number | null
          created_at?: string | null
          estado?: string
          id?: string
          lead_time_dias?: number | null
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_op_codigo: { Args: never; Returns: string }
      generate_ov_codigo: { Args: never; Returns: string }
      get_auth_uid_safe: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_user_taller_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
