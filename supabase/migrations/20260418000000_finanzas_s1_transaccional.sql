-- =================================================================================
-- FINANZAS SPRINT 1: CAPA TRANSACCIONAL (CxC / CxP / PAGOS)
-- =================================================================================

-- 1. Actualizar Terceros (Clasificación y Plazos)
DO $$ BEGIN
    CREATE TYPE nivel_cliente_enum AS ENUM ('N1', 'N2', 'N3');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE terceros
  ADD COLUMN IF NOT EXISTS nivel_cliente nivel_cliente_enum,
  ADD COLUMN IF NOT EXISTS plazo_pago_dias int DEFAULT 30;

-- 2. Actualizar Ordenes de Venta (CxC)
DO $$ BEGIN
    CREATE TYPE estado_pago_enum AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE ordenes_venta
  ADD COLUMN IF NOT EXISTS numero_factura text,
  ADD COLUMN IF NOT EXISTS fecha_factura date,
  ADD COLUMN IF NOT EXISTS plazo_pago_dias int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS estado_pago estado_pago_enum DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS total_facturado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pagado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_ultimo_pago date;

-- 3. Actualizar Ordenes de Compra (CxP)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS numero_factura_proveedor text,
  ADD COLUMN IF NOT EXISTS fecha_factura_proveedor date,
  ADD COLUMN IF NOT EXISTS plazo_pago_dias int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS estado_pago estado_pago_enum DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS total_facturado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pagado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_ultimo_pago date;

-- 4. Nueva Tabla: Pagos (Historial de transacciones)
CREATE TABLE IF NOT EXISTS pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  documento_tipo text NOT NULL CHECK (documento_tipo IN ('ov', 'oc', 'gasto', 'otro')),
  documento_id uuid, -- Link a id de ordenes_venta o ordenes_compra
  tercero_id uuid REFERENCES terceros(id),
  monto numeric NOT NULL,
  metodo_pago text CHECK (metodo_pago IN ('transferencia', 'efectivo', 'cheque', 'credito', 'otro')),
  referencia_bancaria text,
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  notas text,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pagos_documento_id ON pagos(documento_id);
CREATE INDEX IF NOT EXISTS idx_pagos_tercero_id ON pagos(tercero_id);

-- RLS
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pagos para usuarios autenticados" ON pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserción pagos para usuarios autenticados" ON pagos FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Inicializar Umbrales de Clasificación en ajustes_sistema
INSERT INTO ajustes_sistema (id, valor, descripcion)
VALUES 
  ('finanzas_umbral_n2_unidades', '500'::jsonb, 'Unidades/año para sugerir nivel N2'),
  ('finanzas_umbral_n3_unidades', '5000'::jsonb, 'Unidades/año para sugerir nivel N3')
ON CONFLICT (id) DO UPDATE SET valor = EXCLUDED.valor;
