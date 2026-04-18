-- ============================================================
-- SPRINT 3: Inteligencia Financiera Completa
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Clasificación CIF en gastos
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS es_cif BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN gastos.es_cif IS 'true = Costo Indirecto de Fabricación, false = Gasto Operativo';

-- 2. EMPLEADOS
CREATE TABLE IF NOT EXISTS empleados (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT NOT NULL,
  cargo          TEXT NOT NULL,
  area           area_negocio NOT NULL,
  salario_base   DECIMAL(15,2) NOT NULL DEFAULT 0,
  nivel_riesgo_arl INTEGER NOT NULL DEFAULT 1 CHECK (nivel_riesgo_arl BETWEEN 1 AND 5),
  fecha_ingreso  DATE NOT NULL DEFAULT CURRENT_DATE,
  estado         TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver empleados" ON empleados;
CREATE POLICY "Ver empleados" ON empleados FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestionar empleados" ON empleados;
CREATE POLICY "Gestionar empleados" ON empleados FOR ALL TO authenticated USING (true);

-- 3. PRÉSTAMOS
CREATE TABLE IF NOT EXISTS prestamos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion       TEXT NOT NULL,
  entidad           TEXT NOT NULL,
  monto_inicial     DECIMAL(15,2) NOT NULL,
  saldo_actual      DECIMAL(15,2) NOT NULL,
  tasa_interes_mes  DECIMAL(8,4) NOT NULL,
  plazo_meses       INTEGER NOT NULL,
  fecha_inicio      DATE NOT NULL,
  cuota_mensual     DECIMAL(15,2) NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cancelado', 'en_mora')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver prestamos" ON prestamos;
CREATE POLICY "Ver prestamos" ON prestamos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestionar prestamos" ON prestamos;
CREATE POLICY "Gestionar prestamos" ON prestamos FOR ALL TO authenticated USING (true);

-- 4. ACTIVOS FIJOS
CREATE TABLE IF NOT EXISTS activos_fijos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            TEXT NOT NULL,
  valor_compra      DECIMAL(15,2) NOT NULL,
  fecha_compra      DATE NOT NULL,
  vida_util_meses   INTEGER NOT NULL DEFAULT 60,
  depreciacion_mes  DECIMAL(15,2) GENERATED ALWAYS AS (valor_compra / vida_util_meses) STORED,
  estado            TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'vendido', 'dado_de_baja')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activos_fijos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver activos" ON activos_fijos;
CREATE POLICY "Ver activos" ON activos_fijos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestionar activos" ON activos_fijos;
CREATE POLICY "Gestionar activos" ON activos_fijos FOR ALL TO authenticated USING (true);

-- 5. BALANCE CONFIG (valores iniciales para Balance General)
CREATE TABLE IF NOT EXISTS balance_config (
  clave   TEXT PRIMARY KEY,
  valor   DECIMAL(15,2) NOT NULL DEFAULT 0,
  nota    TEXT
);

INSERT INTO balance_config (clave, valor, nota) VALUES
  ('capital_social',        0, 'Aportes de los socios al capital'),
  ('saldo_inicial_bancos',  0, 'Saldo en banco al iniciar el sistema'),
  ('utilidades_retenidas',  0, 'Utilidades de periodos anteriores no distribuidas')
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE balance_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver balance config" ON balance_config;
CREATE POLICY "Ver balance config" ON balance_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestionar balance config" ON balance_config;
CREATE POLICY "Gestionar balance config" ON balance_config FOR ALL TO authenticated USING (true);

-- 6. PARAFISCALES Y CONFIG FINANZAS en ajustes_sistema
INSERT INTO ajustes_sistema (id, valor, descripcion) VALUES
  ('para_pension_empleador',      '12',    'Pensión a cargo del empleador (%)'),
  ('para_salud_empleador',        '8.5',   'Salud a cargo del empleador (%)'),
  ('para_arl_nivel1',             '0.522', 'ARL Nivel 1 - Riesgo Mínimo (%)'),
  ('para_arl_nivel2',             '1.044', 'ARL Nivel 2 - Riesgo Bajo (%)'),
  ('para_arl_nivel3',             '2.436', 'ARL Nivel 3 - Riesgo Medio (%)'),
  ('para_arl_nivel4',             '4.35',  'ARL Nivel 4 - Riesgo Alto (%)'),
  ('para_arl_nivel5',             '6.96',  'ARL Nivel 5 - Riesgo Máximo (%)'),
  ('para_sena',                   '2',     'Aporte SENA (%)'),
  ('para_icbf',                   '3',     'Aporte ICBF (%)'),
  ('para_caja_compensacion',      '4',     'Caja de Compensación Familiar (%)'),
  ('para_prima',                  '8.33',  'Prima de Servicios (%)'),
  ('para_cesantias',              '8.33',  'Cesantías (%)'),
  ('para_intereses_cesantias',    '1',     'Intereses sobre Cesantías (%)'),
  ('para_vacaciones',             '4.17',  'Provisión de Vacaciones (%)'),
  ('impuesto_renta_pct',          '35',    'Tarifa Impuesto de Renta Colombia (%)'),
  ('horizonte_flujo_caja_dias',   '90',    'Horizonte proyección flujo de caja (días)')
ON CONFLICT (id) DO NOTHING;
