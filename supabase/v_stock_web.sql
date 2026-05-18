-- ============================================================
-- v_stock_web — Vista principal del catálogo web
-- Stock neto: INGRESO_COMPRA (+) menos VENTA_WEB (-) en ALM_WEB_01
-- combinacion_id es el FK que NEXUS usa para mostrar pedidos
-- ============================================================

DROP VIEW IF EXISTS v_stock_web CASCADE;

CREATE VIEW v_stock_web AS
WITH mov_agg AS (
  SELECT
    md.combinacion_id,
    SUM(
      CASE
        WHEN m.tipo = 'INGRESO_COMPRA' AND m.almacen_destino_id = 1 THEN md.cantidad * md.signo
        WHEN m.tipo = 'VENTA_WEB'      AND m.almacen_origen_id  = 1 THEN -md.cantidad
        ELSE 0
      END
    ) AS stock_web,
    MAX(
      CASE WHEN m.tipo = 'INGRESO_COMPRA'
        THEN (tr.snapshot_json->>'id_marca')::integer
        ELSE NULL
      END
    ) AS id_marca_ref
  FROM movimiento_detalle md
  JOIN movimiento m ON m.id = md.movimiento_id
  LEFT JOIN traspaso tr ON tr.numero_registro = m.documento_ref
  WHERE m.estado = 'CONFIRMADO'
    AND (
      (m.tipo = 'INGRESO_COMPRA' AND m.almacen_destino_id = 1)
      OR
      (m.tipo = 'VENTA_WEB'     AND m.almacen_origen_id  = 1)
    )
  GROUP BY md.combinacion_id
  HAVING SUM(
    CASE
      WHEN m.tipo = 'INGRESO_COMPRA' AND m.almacen_destino_id = 1 THEN md.cantidad * md.signo
      WHEN m.tipo = 'VENTA_WEB'      AND m.almacen_origen_id  = 1 THEN -md.cantidad
      ELSE 0
    END
  ) > 0
)
SELECT
    c.id                                                    AS combinacion_id,
    COALESCE(mv.descp_marca, '—')                          AS marca,
    l.codigo                                               AS linea_codigo,
    l.descripcion                                          AS linea_descripcion,
    r.codigo                                               AS referencia_codigo,
    r.descripcion                                          AS referencia_descripcion,
    c.material_id,
    mat.descripcion                                        AS material_descripcion,
    c.color_id,
    col.nombre                                             AS color_nombre,
    col.hex_web,
    (SELECT ppd.id_material FROM pedido_proveedor_detalle ppd
     WHERE ppd.linea = l.codigo AND ppd.referencia = r.codigo
       AND ppd.descp_material = mat.descripcion AND ppd.id_material IS NOT NULL
     LIMIT 1)                                              AS id_material_f9,
    (SELECT ppd.id_color FROM pedido_proveedor_detalle ppd
     WHERE ppd.linea = l.codigo AND ppd.referencia = r.codigo
       AND ppd.descp_color = col.nombre AND ppd.id_color IS NOT NULL
     LIMIT 1)                                              AS id_color_f9,
    tl.codigo                                              AS talla_codigo,
    tl.orden_visual                                        AS talla_orden,
    agg.stock_web,
    NULL::numeric                                          AS precio_web,
    COALESCE(ge.descp_grupo_estilo, '')                    AS estilo,
    ge.id_grupo_estilo                                     AS estilo_id
FROM mov_agg agg
JOIN combinacion      c   ON c.id = agg.combinacion_id
JOIN linea            l   ON l.id = c.linea_id
LEFT JOIN grupo_estilo_v2 ge  ON ge.id_grupo_estilo = l.grupo_estilo_id
JOIN referencia       r   ON r.id = c.referencia_id
LEFT JOIN material    mat ON mat.id = c.material_id
LEFT JOIN color       col ON col.id = c.color_id
JOIN talla            tl  ON tl.id = c.talla_id
LEFT JOIN marca_v2    mv  ON mv.id_marca = agg.id_marca_ref;

GRANT SELECT ON v_stock_web TO anon;
GRANT SELECT ON v_stock_web TO authenticated;
