-- =====================================================
-- MIGRACIÓN: CORRECCIÓN DE ESTADOS OV
-- =====================================================
-- Este script soluciona el error de "check constraint" 
-- al marcar una orden como 'entregada'.
-- =====================================================

-- 1. Asegurar que la columna es TEXT para mayor flexibilidad de estados
ALTER TABLE ordenes_venta ALTER COLUMN estado TYPE TEXT;

-- 2. Eliminar la restricción antigua si existe
-- Se intenta con el nombre reportado en el error
ALTER TABLE ordenes_venta DROP CONSTRAINT IF EXISTS ordenes_venta_estado_check;

-- 3. Crear la nueva restricción con el ciclo de vida industrial completo
-- Todos los estados en minúsculas para coincidir con la lógica del frontend (Next.js)
ALTER TABLE ordenes_venta ADD CONSTRAINT ordenes_venta_estado_check 
CHECK (estado IN (
    'borrador', 
    'confirmada', 
    'en_produccion', 
    'terminada', 
    'despachada', 
    'entregada', 
    'completada', 
    'cancelada'
));

-- 4. Normalizar datos existentes a minúsculas
UPDATE ordenes_venta SET estado = LOWER(estado);

-- 5. Verificar estados permitidos
SELECT DISTINCT estado FROM ordenes_venta;
