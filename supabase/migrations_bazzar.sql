-- ============================================================
-- BAZZAR WEB — Migraciones de esquema
-- Ejecutar en Supabase → SQL Editor
-- Todas las operaciones usan IF NOT EXISTS / IF EXISTS
-- para que sea SEGURO re-ejecutar en cualquier momento
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLA: clients_bazaar (antes cliente_web)
--    Clientes finales Bazzar — tablet + web
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regclass('public.clients_bazaar') IS NULL
     AND to_regclass('public.cliente_web') IS NOT NULL THEN
    ALTER TABLE public.cliente_web RENAME TO clients_bazaar;
  END IF;
END $$;

ALTER TABLE clients_bazaar
  ADD COLUMN IF NOT EXISTS telefono   TEXT,
  ADD COLUMN IF NOT EXISTS direccion  TEXT,
  ADD COLUMN IF NOT EXISTS canal_registro TEXT NOT NULL DEFAULT 'TIENDA',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- 2. TABLA: pedido_web
--    NEXUS hace LEFT JOIN cliente_web ON cliente_web_id
--    Si la columna no existe, la query falla silenciosamente
--    y la lista queda vacía aunque el contador muestre pedidos
-- ────────────────────────────────────────────────────────────

ALTER TABLE pedido_web
  ADD COLUMN IF NOT EXISTS cliente_web_id BIGINT REFERENCES clients_bazaar(id),
  ADD COLUMN IF NOT EXISTS notas_admin    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();


-- ────────────────────────────────────────────────────────────
-- 3. TABLA: pedido_web_detalle
--    Columnas descriptivas que bazzar-web inserta
-- ────────────────────────────────────────────────────────────

ALTER TABLE pedido_web_detalle
  ADD COLUMN IF NOT EXISTS linea_codigo      TEXT,
  ADD COLUMN IF NOT EXISTS referencia_codigo TEXT,
  ADD COLUMN IF NOT EXISTS color_nombre      TEXT,
  ADD COLUMN IF NOT EXISTS material_desc     TEXT,
  ADD COLUMN IF NOT EXISTS talla_codigo      TEXT,
  ADD COLUMN IF NOT EXISTS marca             TEXT,
  ADD COLUMN IF NOT EXISTS imagen_url        TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_json     JSONB;


-- ────────────────────────────────────────────────────────────
-- 4. BACKFILL: enlazar pedidos existentes con cliente_web
--    Para los 3 pedidos creados antes de que existiera la columna
-- ────────────────────────────────────────────────────────────

UPDATE pedido_web pw
SET cliente_web_id = cw.id
FROM clients_bazaar cw
WHERE pw.cliente_web_id IS NULL
  AND pw.cliente_email IS NOT NULL
  AND pw.cliente_email != ''
  AND cw.email = pw.cliente_email;

-- Fallback: intentar por teléfono si no se enlazó por email
UPDATE pedido_web pw
SET cliente_web_id = cw.id
FROM clients_bazaar cw
WHERE pw.cliente_web_id IS NULL
  AND pw.cliente_telefono IS NOT NULL
  AND pw.cliente_telefono != ''
  AND cw.telefono = pw.cliente_telefono;


-- ────────────────────────────────────────────────────────────
-- 5. VERIFICACIÓN: revisar el resultado
-- ────────────────────────────────────────────────────────────

SELECT
  pw.id,
  pw.estado,
  pw.cliente_nombre,
  pw.cliente_web_id,
  cw.cedula,
  pw.total,
  pw.created_at
FROM pedido_web pw
LEFT JOIN clients_bazaar cw ON cw.id = pw.cliente_web_id
ORDER BY pw.created_at DESC
LIMIT 20;
