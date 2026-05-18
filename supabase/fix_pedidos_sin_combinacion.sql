-- ============================================================
-- FIX: Rechazar pedidos con combinacion_id NULL en sus detalles
-- Ejecutar UNA VEZ en Supabase → SQL Editor
-- ============================================================
-- Estos pedidos fueron creados antes del fix de combinacion_id.
-- NEXUS no puede mostrarlos ni procesarlos porque el JOIN con
-- la tabla 'combinacion' retorna vacío cuando el FK es NULL.
-- ============================================================

UPDATE pedido_web
SET
  estado       = 'RECHAZADO',
  notas_admin  = 'Rechazado automáticamente: pedido creado sin combinacion_id (versión anterior del sistema). Cliente debe volver a realizar el pedido.'
WHERE
  estado = 'PENDIENTE'
  AND id IN (
    SELECT DISTINCT pedido_id
    FROM pedido_web_detalle
    WHERE combinacion_id IS NULL
  );

-- Verificar el resultado:
SELECT id, estado, cliente_nombre, total, notas_admin
FROM pedido_web
WHERE notas_admin LIKE 'Rechazado automáticamente%';
