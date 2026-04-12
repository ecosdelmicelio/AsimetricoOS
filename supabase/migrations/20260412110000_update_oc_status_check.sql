-- Actualización de estados permitidos para las órdenes de compra (OC)
-- Permite estados: pendiente, en_proceso, parcial, completada, finalizada, cancelada, na, cargado, pendiente_afidavit

ALTER TABLE ordenes_compra 
DROP CONSTRAINT IF EXISTS ordenes_compra_estado_documental_check;

ALTER TABLE ordenes_compra 
ADD CONSTRAINT ordenes_compra_estado_documental_check 
CHECK (estado_documental IN (
  'pendiente', 
  'en_proceso', 
  'parcial', 
  'completada', 
  'finalizada', 
  'cancelada', 
  'na', 
  'cargado', 
  'pendiente_afidavit'
));

-- Saneamiento: Convertir 'na' (que es confuso) a 'pendiente' para órdenes nuevas
UPDATE ordenes_compra 
SET estado_documental = 'pendiente' 
WHERE estado_documental = 'na';
