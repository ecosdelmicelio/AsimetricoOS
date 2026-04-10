ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS minimo_orden numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS multiplo_orden numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS leadtime_dias integer DEFAULT 0;

ALTER TABLE public.materiales
ADD COLUMN IF NOT EXISTS minimo_orden numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS multiplo_orden numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS leadtime_dias integer DEFAULT 0;
