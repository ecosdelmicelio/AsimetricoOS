-- 1. Agregar columnas a tablas existentes
ALTER TABLE ordenes_produccion ADD COLUMN IF NOT EXISTS ov_id UUID REFERENCES ordenes_venta(id);
ALTER TABLE kardex ADD COLUMN IF NOT EXISTS ov_id UUID REFERENCES ordenes_venta(id);
ALTER TABLE kardex ADD COLUMN IF NOT EXISTS oc_id UUID REFERENCES ordenes_compra(id);
ALTER TABLE kardex ADD COLUMN IF NOT EXISTS bin_id UUID REFERENCES bines(id);

-- 2. Crear tipos de datos
DO $$ BEGIN
    CREATE TYPE estado_despacho AS ENUM ('preparacion', 'enviado', 'entregado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_envio AS ENUM ('interno', 'externo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Crear tabla de despachos
CREATE TABLE IF NOT EXISTS despachos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ov_id UUID NOT NULL REFERENCES ordenes_venta(id) ON DELETE CASCADE,
    numero_despacho SERIAL,
    fecha_despacho TIMESTAMPTZ DEFAULT now(),
    estado estado_despacho DEFAULT 'preparacion',
    transportadora TEXT,
    guia_seguimiento TEXT,
    tipo_envio tipo_envio DEFAULT 'externo',
    notas TEXT,
    total_bultos INT DEFAULT 1,
    creado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Crear tabla de detalle de despachos
CREATE TABLE IF NOT EXISTS despacho_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
    bin_id UUID REFERENCES bines(id), -- Opcional, si viene de un bin
    producto_id UUID NOT NULL REFERENCES productos(id),
    talla TEXT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tipos de movimiento Kardex (asegurar que exista SALIDA_VENTA)
INSERT INTO kardex_tipos_movimiento (codigo, nombre, categoria, activo)
VALUES ('SALIDA_VENTA', 'Salida por Venta / Despacho', 'salida', true)
ON CONFLICT (codigo) DO NOTHING;

-- 6. Habilitar RLS
ALTER TABLE despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE despacho_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Permitir todo a usuarios autenticados por ahora, ajustar según necesidad)
CREATE POLICY "Permitir todo a autenticados" ON despachos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a autenticados" ON despacho_detalle FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_despachos_updated_at ON despachos;
CREATE TRIGGER update_despachos_updated_at
    BEFORE UPDATE ON despachos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
