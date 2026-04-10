-- Migration: 20260410170100_add_nombre_to_posiciones.sql
-- Description: Add name column to bodega_posiciones table

ALTER TABLE public.bodega_posiciones ADD COLUMN IF NOT EXISTS nombre TEXT;

-- Update existing records to have a name based on their code if necessary
UPDATE public.bodega_posiciones SET nombre = codigo WHERE nombre IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.bodega_posiciones.nombre IS 'Nombre descriptivo de la posición física.';
