-- Fix for OP-2026-015 getting stuck in 'liquidada' without kardex movements

DO $$
DECLARE
    v_op_id uuid;
BEGIN
    -- Obtener el ID de la OP
    SELECT id INTO v_op_id
    FROM ordenes_produccion
    WHERE codigo = 'OP-2026-015';

    IF v_op_id IS NULL THEN
        RAISE NOTICE 'Error: OP-2026-015 no encontrada en la base de datos.';
        RETURN;
    END IF;

    -- 1. Eliminar la liquidación fallida si se llegó a crear
    -- (Opcional, previene errores de unique constraint al intentar reliquidar)
    DELETE FROM liquidacion_op WHERE op_id = v_op_id;

    -- 2. Asegurar que no hay registros residuales en el kardex para esta OP
    DELETE FROM kardex WHERE documento_tipo = 'op' AND documento_id = v_op_id;

    -- 3. Restaurar el estado de la OP a 'entregada' para que pueda volver a ser procesada
    UPDATE ordenes_produccion
    SET estado = 'entregada'
    WHERE id = v_op_id;

    RAISE NOTICE 'Éxito: OP-2026-015 revertida a estado entregada exitosamente.';
END $$;
