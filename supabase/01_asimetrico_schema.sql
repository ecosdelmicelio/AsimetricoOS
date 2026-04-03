-- =====================================================
-- SCHEMA ASIMÉTRICO OS - MÓDULOS 1 Y 2
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard > SQL Editor
-- 2. Copia y pega este script completo
-- 3. Ejecuta (Run)
-- =====================================================

-- =====================================================
-- MÓDULO 1: ADN DE PRODUCTOS
-- =====================================================

-- Estados de Item
DO $$ BEGIN
    CREATE TYPE estado_item_enum AS ENUM ('ACTIVO', 'INACTIVO', 'EN DESARROLLO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Unidades de Medida
DO $$ BEGIN
    CREATE TYPE udm_enum AS ENUM ('MT', 'UD', 'KG', 'LB', 'CONO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Maestro Padres PT (Productos Terminados)
CREATE TABLE IF NOT EXISTS maestro_padres_pt (
    id_sku_padre TEXT PRIMARY KEY CHECK (length(id_sku_padre) = 19),
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    estado_item estado_item_enum DEFAULT 'EN DESARROLLO',
    foto_referencia_url TEXT,
    nombre_articulo TEXT NOT NULL,
    ref_cliente TEXT,
    precio_techo DECIMAL(12, 2) DEFAULT 0,
    -- Atributos ADN (Quick Add params)
    adn_cli TEXT,
    adn_cat TEXT,
    adn_sub TEXT,
    adn_fit TEXT,
    adn_ref TEXT,
    adn_inf TEXT,
    adn_manga TEXT,
    adn_col TEXT,
    adn_ori TEXT
);

-- 2. Maestro Padres MP (Materias Primas)
CREATE TABLE IF NOT EXISTS maestro_padres_mp (
    id_sku_padre TEXT PRIMARY KEY CHECK (length(id_sku_padre) = 13),
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    nombre_articulo TEXT NOT NULL,
    udm udm_enum DEFAULT 'MT',
    linea BOOLEAN DEFAULT true,
    -- proveedor_primario UUID REFERENCES terceros(id), -- Pendiente Módulo 3
    ultimo_precio DECIMAL(12, 2) DEFAULT 0,
    leadtime INTEGER DEFAULT 0,
    foto_textura_url TEXT,
    version INTEGER DEFAULT 1
);

-- 3. Maestro Hijos (SKU + Talla/Lote)
CREATE TABLE IF NOT EXISTS maestro_hijos (
    id_sku_hijo TEXT PRIMARY KEY,
    id_padre_pt TEXT REFERENCES maestro_padres_pt(id_sku_padre) ON DELETE CASCADE,
    id_padre_mp TEXT REFERENCES maestro_padres_mp(id_sku_padre) ON DELETE CASCADE,
    talla_o_lote TEXT NOT NULL,
    stock_minimo INTEGER DEFAULT 0,
    -- Asegurarnos que pertenezca a un PT o a un MP exclusivo
    CONSTRAINT check_parent EXCLUSION (
        (id_padre_pt IS NOT NULL AND id_padre_mp IS NOT NULL) WITH =
    )
);


-- =====================================================
-- MÓDULO 2: ÓRDENES DE VENTA (OV)
-- =====================================================

-- Estados de Pedido
DO $$ BEGIN
    CREATE TYPE estado_ov_enum AS ENUM ('Borrador', 'Solicitud_Margen', 'Confirmado', 'En_Produccion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Prioridades
DO $$ BEGIN
    CREATE TYPE prioridad_enum AS ENUM ('Baja', 'Media', 'Alta', 'CRÍTICA', 'Normal', 'Urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Cabecera OV
CREATE TABLE IF NOT EXISTS ordenes_venta (
    id_pedido TEXT PRIMARY KEY, -- Ej: OV-001
    -- id_cliente UUID REFERENCES clientes(id), -- Pendiente tabla de terceros
    oc_cliente TEXT,
    fecha_pedido DATE DEFAULT CURRENT_DATE,
    fecha_entrega DATE NOT NULL,
    vendedor_id UUID REFERENCES auth.users(id),
    prioridad_gral prioridad_enum DEFAULT 'Media',
    estado estado_ov_enum DEFAULT 'Borrador',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Detalle OV (Matriz)
CREATE TABLE IF NOT EXISTS ov_detalle (
    id_detalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pedido TEXT NOT NULL REFERENCES ordenes_venta(id_pedido) ON DELETE CASCADE,
    id_sku_padre TEXT REFERENCES maestro_padres_pt(id_sku_padre),
    talla TEXT NOT NULL,
    id_sku_hijo TEXT NOT NULL, -- Logical link to maestro_hijos.id_sku_hijo
    cantidad INTEGER NOT NULL DEFAULT 0,
    precio_pactado DECIMAL(12, 2) NOT NULL DEFAULT 0,
    costo_base_estimado DECIMAL(12, 2) DEFAULT 0, -- Para calcular margen
    margen_item DECIMAL(5, 4) GENERATED ALWAYS AS (
        CASE WHEN precio_pactado > 0 THEN (precio_pactado - costo_base_estimado) / precio_pactado ELSE 0 END
    ) STORED,
    prioridad_item prioridad_enum DEFAULT 'Normal',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS básico
ALTER TABLE maestro_padres_pt ENABLE ROW LEVEL SECURITY;
ALTER TABLE maestro_padres_mp ENABLE ROW LEVEL SECURITY;
ALTER TABLE maestro_hijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE ov_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas iniciales (Ajustar en producción según Rol)
CREATE POLICY "Permitir todo a usuarios autenticados" ON maestro_padres_pt FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON maestro_padres_mp FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON maestro_hijos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON ordenes_venta FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir todo a usuarios autenticados" ON ov_detalle FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'Tablas Asimétrico OS creadas exitosamente' as status;
