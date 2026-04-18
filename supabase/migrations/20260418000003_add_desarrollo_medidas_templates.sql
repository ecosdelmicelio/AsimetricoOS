-- Migration: Add desarrollo_medidas_templates table
CREATE TABLE IF NOT EXISTS desarrollo_medidas_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_producto TEXT NOT NULL,
  cliente_id UUID REFERENCES terceros(id),
  nombre_fit TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  puntos_medida JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for upsert conflict and lookups (Handling NULL values in bitmask)
CREATE UNIQUE INDEX IF NOT EXISTS idx_medidas_templates_generic 
ON desarrollo_medidas_templates (categoria_producto, nombre_fit) 
WHERE cliente_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_medidas_templates_client 
ON desarrollo_medidas_templates (categoria_producto, cliente_id, nombre_fit) 
WHERE cliente_id IS NOT NULL;

-- RLS
ALTER TABLE desarrollo_medidas_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todo a usuarios autenticados" ON desarrollo_medidas_templates;
CREATE POLICY "Todo a usuarios autenticados" ON desarrollo_medidas_templates FOR ALL TO authenticated USING (true);
