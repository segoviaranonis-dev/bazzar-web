-- ============================================================
-- ETAPA BAZZAR-WEB-001 — Migraciones de seguridad y checkout
-- Ejecutar en Supabase → SQL Editor (seguro re-ejecutar)
-- ============================================================

-- 1. Token de acceso a confirmación de pedido (evita enumeración pública)
ALTER TABLE pedido_web
  ADD COLUMN IF NOT EXISTS token_acceso TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedido_web_token_acceso
  ON pedido_web (token_acceso)
  WHERE token_acceso IS NOT NULL;

-- 2. Liberar reservas si checkout falla a mitad de camino
CREATE OR REPLACE FUNCTION public.liberar_stock_reserva(p_pedido_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pedido_id IS NULL THEN
    RETURN;
  END IF;

  -- Anula movimientos VENTA_WEB asociados al pedido web
  UPDATE movimiento m
  SET estado = 'ANULADO',
      updated_at = NOW()
  WHERE m.tipo = 'VENTA_WEB'
    AND m.documento_ref = p_pedido_id::text
    AND m.estado = 'CONFIRMADO';
END;
$$;

COMMENT ON FUNCTION public.liberar_stock_reserva IS
  'ETAPA-001: revierte reservas de stock de un pedido web fallido o cancelado.';

GRANT EXECUTE ON FUNCTION public.liberar_stock_reserva TO service_role;
