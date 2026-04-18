-- Sprint 2: Gastos y Presupuestos
-- Áreas de Negocio
CREATE TYPE area_negocio AS ENUM (
  'Comercial',
  'Mercadeo',
  'Administrativo',
  'Operaciones',
  'Desarrollo',
  'Logistica',
  'Talento_Humano'
);

-- Tipos de Gasto
CREATE TYPE tipo_gasto AS ENUM (
  'fijo',
  'variable',
  'semivariable'
);

-- Categorías de Gastos (Jerárquicas)
CREATE TABLE categorias_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  parent_id UUID REFERENCES categorias_gastos(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Gastos
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  monto_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cantidad INTEGER NOT NULL DEFAULT 1,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  area area_negocio NOT NULL,
  tipo tipo_gasto NOT NULL,
  categoria_id UUID REFERENCES categorias_gastos(id),
  tercero_id UUID REFERENCES terceros(id), -- Proveedor del gasto
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_total CHECK (monto_total = (costo_unitario * cantidad))
);

-- Presupuestos Mensuales por Área
CREATE TABLE presupuestos_area (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area area_negocio NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  monto_limite DECIMAL(15, 2) NOT NULL DEFAULT 0,
  UNIQUE(area, mes, anio)
);

-- Categorías por Defecto
INSERT INTO categorias_gastos (nombre) VALUES
('Tecnología'),
('Servicios Públicos'),
('Arrendamiento'),
('Nómina'),
('Publicidad'),
('Transporte'),
('Mantenimiento'),
('Software/Licencias'),
('Hardware');

-- RLS
ALTER TABLE categorias_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_area ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver categorias gastos" ON categorias_gastos FOR SELECT USING (true);
CREATE POLICY "Gestionar categorias gastos" ON categorias_gastos FOR ALL TO authenticated USING (true);

CREATE POLICY "Ver gastos" ON gastos FOR SELECT USING (true);
CREATE POLICY "Gestionar gastos" ON gastos FOR ALL TO authenticated USING (true);

CREATE POLICY "Ver presupuestos" ON presupuestos_area FOR SELECT USING (true);
CREATE POLICY "Gestionar presupuestos" ON presupuestos_area FOR ALL TO authenticated USING (true);
