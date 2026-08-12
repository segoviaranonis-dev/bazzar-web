-- Bóveda Oro WEB · captura transacción completa (pago + Delivery Bazzar)
-- CHUSAR 2.5.1.27 · Report /bazzar-web/bobeda-oro
-- Futuro: alimentar contabilidad / situación financiera holding

ALTER TABLE pedido_web
  ADD COLUMN IF NOT EXISTS pago_estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS pago_proveedor TEXT DEFAULT 'BANCARD',
  ADD COLUMN IF NOT EXISTS pago_ref_externa TEXT,
  ADD COLUMN IF NOT EXISTS pago_monto NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pago_moneda TEXT NOT NULL DEFAULT 'PYG',
  ADD COLUMN IF NOT EXISTS pago_iniciado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pago_confirmado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entrega_estado TEXT NOT NULL DEFAULT 'PENDIENTE_COORDINACION',
  ADD COLUMN IF NOT EXISTS entrega_carrier TEXT NOT NULL DEFAULT 'DELIVERY_BAZZAR',
  ADD COLUMN IF NOT EXISTS entrega_ventana TEXT,
  ADD COLUMN IF NOT EXISTS entrega_direccion_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS entrega_telefono_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS entrega_handoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entrega_confirmada_cliente_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entrega_sla_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS snapshot_transaccion JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pedido_web.snapshot_transaccion IS
  'Bóveda Oro WEB — JSON canónico de la transacción para Delivery + futuro contable';

CREATE INDEX IF NOT EXISTS idx_pedido_web_pago_estado ON pedido_web (pago_estado);
CREATE INDEX IF NOT EXISTS idx_pedido_web_entrega_estado ON pedido_web (entrega_estado);
