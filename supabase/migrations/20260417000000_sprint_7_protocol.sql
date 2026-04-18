-- =================================================================================
-- PROTOCOLO SPRINT 7: MUESTREO PLM Y KPIs
-- =================================================================================

-- 1. Modificar tabla desarrollo para adaptarla al Blueprint Operativo
ALTER TABLE desarrollo
  ADD COLUMN IF NOT EXISTS tipo_muestra_asignada text CHECK (tipo_muestra_asignada IN ('A', 'B', 'C', 'D')),
  ADD COLUMN IF NOT EXISTS disonancia_activa boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_cierre text CHECK (estado_cierre IN ('aprobado', 'descartado', 'derivado', 'hold')),
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_hold_dt timestamptz,
  ADD COLUMN IF NOT EXISTS json_alta_resolucion jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS json_auditoria jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS chasis_producto_id uuid REFERENCES productos(id);

-- Opcional: Deprecar complejidad visualmente o droperarla si se desea
-- ALTER TABLE desarrollo DROP COLUMN IF EXISTS complejidad;

-- 2. Función KPI para "Innovación Comercial"
-- Retorna el % de Ingresos Comerciales del catálogo de Innovación (productos recientes <= 24 meses)
CREATE OR REPLACE FUNCTION kpi_innovacion_comercial()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sales numeric;
  innovation_sales numeric;
  innovation_pct numeric;
BEGIN
  -- Calcular las ventas totales de órdenes confirmadas/entregadas/completadas
  SELECT COALESCE(SUM(od.cantidad * od.precio_pactado), 0) INTO total_sales
  FROM ov_detalle od
  JOIN ordenes_venta ov ON od.ov_id = ov.id
  WHERE ov.estado IN ('entregada', 'completada');
  
  -- Calcular las ventas sólo de productos creados en los últimos 24 meses
  SELECT COALESCE(SUM(od.cantidad * od.precio_pactado), 0) INTO innovation_sales
  FROM ov_detalle od
  JOIN ordenes_venta ov ON od.ov_id = ov.id
  JOIN productos p ON od.producto_id = p.id
  WHERE ov.estado IN ('entregada', 'completada')
    AND p.created_at >= (NOW() - INTERVAL '24 months');
    
  -- Retornar %
  IF total_sales = 0 THEN
    RETURN 0;
  END IF;
  
  innovation_pct := (innovation_sales / total_sales) * 100;
  RETURN ROUND(innovation_pct, 2);
END;
$$;
