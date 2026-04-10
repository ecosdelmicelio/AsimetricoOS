-- Migration: 20260410163500_wms_hierarchy_positions.sql
-- Description: Create bodega_posiciones table and update bines table

-- 1. Create bodega_posiciones table
CREATE TABLE IF NOT EXISTS public.bodega_posiciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id UUID NOT NULL REFERENCES public.bodegas(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    capacidad_bines INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bodega_id, codigo)
);

-- Enable RLS
ALTER TABLE public.bodega_posiciones ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Permitir lectura de posiciones a todos los autenticados" 
ON public.bodega_posiciones FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserción de posiciones a todos los autenticados" 
ON public.bodega_posiciones FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir actualización de posiciones a todos los autenticados" 
ON public.bodega_posiciones FOR UPDATE 
TO authenticated 
USING (true);

-- 2. Update bines table
ALTER TABLE public.bines ADD COLUMN IF NOT EXISTS posicion_id UUID REFERENCES public.bodega_posiciones(id);
ALTER TABLE public.bines ADD COLUMN IF NOT EXISTS es_fijo BOOLEAN DEFAULT FALSE;

-- 3. Comment on columns for documentation
COMMENT ON TABLE public.bodega_posiciones IS 'Lugares físicos fijos dentro de una bodega.';
COMMENT ON COLUMN public.bines.es_fijo IS 'Determina si el bin es parte de la estructura fija (ej. cajón) o si es movible.';
