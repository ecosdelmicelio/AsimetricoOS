-- 1. Crear tabla de zonas
CREATE TABLE IF NOT EXISTS public.bodega_zonas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id UUID NOT NULL REFERENCES public.bodegas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bodega_id, codigo)
);

-- 2. Habilitar RLS para zonas
ALTER TABLE public.bodega_zonas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de zonas a todos los autenticados" 
ON public.bodega_zonas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción de zonas a todos los autenticados" 
ON public.bodega_zonas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir actualización de zonas a todos los autenticados" 
ON public.bodega_zonas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir eliminación de zonas a todos los autenticados" 
ON public.bodega_zonas FOR DELETE TO authenticated USING (true);

-- 3. Modificar tabla de posiciones para incluir el vínculo con zonas
ALTER TABLE public.bodega_posiciones ADD COLUMN IF NOT EXISTS zona_id UUID REFERENCES public.bodega_zonas(id);

-- 4. Comentarios de documentación
COMMENT ON TABLE public.bodega_zonas IS 'Grupos lógicos de posiciones físicas (ej: Almacenado, Picking, Cuarentena).';
COMMENT ON COLUMN public.bodega_posiciones.zona_id IS 'Zona a la que pertenece esta posición física.';
