-- =================================================================================
-- TABLA DE AJUSTES DEL SISTEMA
-- =================================================================================

CREATE TABLE IF NOT EXISTS ajustes_sistema (
  id text PRIMARY KEY,
  valor jsonb NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now()
);

-- Permisos
ALTER TABLE ajustes_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ajustes visibles para todos los autenticados" ON ajustes_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ajustes editables por autenticados" ON ajustes_sistema FOR ALL TO authenticated USING (true);

-- Valor inicial para producto nuevo
INSERT INTO ajustes_sistema (id, valor, descripcion)
VALUES ('meses_producto_nuevo', '24'::jsonb, 'Periodo en meses para considerar un producto como innovación (nuevo)')
ON CONFLICT (id) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- =================================================================================
-- REFACTORIZACIÓN FUNCIÓN KPI INNOVACIÓN
-- =================================================================================

CREATE OR REPLACE FUNCTION kpi_innovacion_comercial()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sales numeric;
  innovation_sales numeric;
  innovation_pct numeric;
  meses_nuevo int;
BEGIN
  -- Obtener el valor de la configuración
  SELECT (valor#>>'{}')::int INTO meses_nuevo 
  FROM ajustes_sistema 
  WHERE id = 'meses_producto_nuevo';
  
  -- Default si no existe
  IF meses_nuevo IS NULL THEN
    meses_nuevo := 24;
  END IF;

  -- Calcular las ventas totales de órdenes confirmadas/entregadas/completadas
  SELECT COALESCE(SUM(od.cantidad * od.precio_pactado), 0) INTO total_sales
  FROM ov_detalle od
  JOIN ordenes_venta ov ON od.ov_id = ov.id
  WHERE ov.estado IN ('entregada', 'completada');
  
  -- Calcular las ventas sólo de productos creados en los últimos X meses
  SELECT COALESCE(SUM(od.cantidad * od.precio_pactado), 0) INTO innovation_sales
  FROM ov_detalle od
  JOIN ordenes_venta ov ON od.ov_id = ov.id
  JOIN productos p ON od.producto_id = p.id
  WHERE ov.estado IN ('entregada', 'completada')
    AND p.created_at >= (NOW() - (meses_nuevo || ' months')::interval);
    
  -- Retornar %
  IF total_sales = 0 THEN
    RETURN 0;
  END IF;
  
  innovation_pct := (innovation_sales / total_sales) * 100;
  RETURN ROUND(innovation_pct, 2);
END;
$$;
