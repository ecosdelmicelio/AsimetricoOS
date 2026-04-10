ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS stock_seguridad numeric DEFAULT 0;

ALTER TABLE public.materiales
ADD COLUMN IF NOT EXISTS stock_seguridad numeric DEFAULT 0;
