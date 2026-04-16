-- 1. Addition of Logistics / Supply Chain variables to Master Data MP (Materiales)
ALTER TABLE materiales 
ADD COLUMN minimo_compra numeric DEFAULT NULL,
ADD COLUMN multiplo_compra numeric DEFAULT NULL,
ADD COLUMN leadtime_dias integer DEFAULT NULL,
ADD COLUMN stock_seguridad numeric DEFAULT NULL,
ADD COLUMN tolerancia_recepcion_pct numeric DEFAULT NULL,
ADD COLUMN unidad_empaque text DEFAULT NULL;

-- 2. Create the Product Alias (B2B Cross-Reference) Table
CREATE TABLE producto_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  sku_cliente text NOT NULL, -- The custom code for this client (e.g. CAMISA-ZARA)
  nombre_comercial_cliente text, -- How the client calls this product
  precio_acordado numeric, -- Optional override for B2B price lists
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_por uuid REFERENCES auth.users(id),
  UNIQUE (producto_id, cliente_id),
  UNIQUE (sku_cliente)
);

-- Indices for performance
CREATE INDEX idx_producto_clientes_producto_id ON producto_clientes(producto_id);
CREATE INDEX idx_producto_clientes_cliente_id ON producto_clientes(cliente_id);
CREATE INDEX idx_producto_clientes_sku ON producto_clientes(sku_cliente);

-- Enable RLS
ALTER TABLE producto_clientes ENABLE ROW LEVEL SECURITY;

-- Standard Policies
CREATE POLICY "Lectura pública para usuarios autenticados en producto_clientes"
ON producto_clientes FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Inserción para usuarios autenticados en producto_clientes"
ON producto_clientes FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Actualización para usuarios autenticados en producto_clientes"
ON producto_clientes FOR UPDATE
TO authenticated USING (true);
