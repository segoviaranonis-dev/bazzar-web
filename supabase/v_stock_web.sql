-- ============================================================
-- v_stock_web — Catálogo web P0 + protocolo Stock Sano (ALM_WEB_01)
-- Stock neto: INGRESO_COMPRA (+) menos VENTA_WEB (-)
-- precio_web: lista WEB vigente; fallback stock_sano_deposito (canon)
-- Ejecutar: node scripts/apply_v_stock_web.mjs
-- ============================================================

DROP VIEW IF EXISTS v_stock_web CASCADE;

CREATE VIEW v_stock_web AS
WITH mov_agg AS (
    SELECT
        md.combinacion_id,
        sum(
            CASE
                WHEN m.tipo = 'INGRESO_COMPRA' AND m.almacen_destino_id = 1 THEN md.cantidad * md.signo
                WHEN m.tipo = 'VENTA_WEB'      AND m.almacen_origen_id  = 1 THEN -md.cantidad
                ELSE 0
            END
        ) AS stock_web,
        (
            SELECT NULLIF(t.snapshot_json ->> 'id_marca', '')::int
            FROM traspaso t
            JOIN traspaso_detalle td ON td.traspaso_id = t.id
            WHERE td.combinacion_id = md.combinacion_id
              AND t.almacen_destino_id = 1
              AND t.estado = 'CONFIRMADO'
              AND t.snapshot_json IS NOT NULL
              AND jsonb_typeof(t.snapshot_json) = 'object'
            ORDER BY t.id DESC
            LIMIT 1
        ) AS id_marca_ref
    FROM movimiento m
    JOIN movimiento_detalle md ON md.movimiento_id = m.id
    WHERE (
        (m.tipo = 'INGRESO_COMPRA' AND m.almacen_destino_id = 1) OR
        (m.tipo = 'VENTA_WEB'      AND m.almacen_origen_id  = 1)
    )
    GROUP BY md.combinacion_id
    HAVING sum(
        CASE
            WHEN m.tipo = 'INGRESO_COMPRA' AND m.almacen_destino_id = 1 THEN md.cantidad * md.signo
            WHEN m.tipo = 'VENTA_WEB'      AND m.almacen_origen_id  = 1 THEN -md.cantidad
            ELSE 0
        END
    ) > 0
)
SELECT
    c.id                                        AS combinacion_id,
    COALESCE(mv.descp_marca, '—')               AS marca,
    l.id                                        AS linea_id,
    l.proveedor_id                              AS proveedor_importacion_id,
    l.codigo_proveedor::text                    AS linea_codigo,
    r.id                                        AS referencia_id,
    l.descripcion                               AS linea_descripcion,
    r.codigo_proveedor::text                    AS referencia_codigo,
    r.descripcion                               AS referencia_descripcion,
    c.material_id,
    mat.codigo_proveedor::text                  AS material_code,
    mat.descripcion                             AS material_descripcion,
    c.color_id,
    col.codigo_proveedor::text                  AS color_code,
    col.nombre                                  AS color_nombre,
    col.hex_web,
    COALESCE(
      ppd_trp.id_material,
      (
        SELECT ppd.id_material FROM pedido_proveedor_detalle ppd
        WHERE ppd.linea = l.codigo_proveedor::text
          AND ppd.referencia = r.codigo_proveedor::text
          AND (
            ppd.descp_material = mat.descripcion
            OR ppd.descp_material = mat.codigo_proveedor::text
            OR ppd.descp_material = ('K' || l.codigo_proveedor::text)
          )
          AND ppd.id_material IS NOT NULL
        LIMIT 1
      )
    )                                           AS id_material_f9,
    COALESCE(
      ppd_trp.id_color,
      (
        SELECT ppd.id_color FROM pedido_proveedor_detalle ppd
        WHERE ppd.linea = l.codigo_proveedor::text
          AND ppd.referencia = r.codigo_proveedor::text
          AND (
            ppd.descp_color = col.nombre
            OR ppd.id_color = c.color_id
          )
          AND ppd.id_color IS NOT NULL
        LIMIT 1
      )
    )                                           AS id_color_f9,
    ppd_trp.ppd_color_codigo                    AS ppd_color_codigo,
    NULL::text                                  AS imagen_url,
    tl.talla_etiqueta                            AS talla_codigo,
    tl.orden_visual                             AS talla_orden,
    agg.stock_web,
    COALESCE(
      (
        SELECT p.valor
        FROM precio p
        JOIN lista_precio lp ON lp.id = p.lista_id
        WHERE p.combinacion_id = c.id
          AND p.fecha_hasta IS NULL
          AND lp.tipo = 'WEB'
          AND lp.activa = true
        ORDER BY p.id DESC
        LIMIT 1
      ),
      ssd.precio_venta
    )                                           AS precio_web,
    ssd.caso_codigo                             AS stock_sano_caso,
    ssd.markup_pct                              AS stock_sano_markup_pct,
    ssd.lpn                                     AS stock_sano_lpn,
    CASE
      WHEN sa.protocolo_activo IS NOT TRUE THEN NULL
      WHEN ssd.id IS NOT NULL THEN 'SANO'
      ELSE 'SIN_PROTOCOLO'
    END                                         AS stock_sano_estado,
    COALESCE(ge.descp_grupo_estilo, '')         AS descp_grupo_estilo,
    ge.id_grupo_estilo                          AS grupo_estilo_id,
    l.genero_id                                 AS genero_id,
    COALESCE(gen.descripcion, gen.codigo, '')   AS descp_genero
FROM mov_agg agg
JOIN combinacion c     ON c.id   = agg.combinacion_id
JOIN linea l           ON l.id   = c.linea_id
LEFT JOIN grupo_estilo_v2 ge ON ge.id_grupo_estilo = l.grupo_estilo_id
JOIN referencia r      ON r.id   = c.referencia_id
LEFT JOIN material mat ON mat.id = c.material_id
LEFT JOIN color col    ON col.id = c.color_id
JOIN talla tl          ON tl.id  = c.talla_id
LEFT JOIN marca_v2 mv  ON mv.id_marca = COALESCE(agg.id_marca_ref, l.marca_id)
LEFT JOIN genero gen   ON gen.id = l.genero_id
LEFT JOIN stock_sano_almacen sa ON sa.almacen_id = 1 AND sa.protocolo_activo = true
LEFT JOIN stock_sano_deposito ssd ON ssd.almacen_id = 1
  AND ssd.linea_id = c.linea_id
  AND ssd.referencia_id = c.referencia_id
  AND ssd.material_id_key = COALESCE(c.material_id, 0)
LEFT JOIN LATERAL (
  SELECT ppd.id_material, ppd.id_color, ppd.id_color AS ppd_color_codigo
  FROM traspaso t
  JOIN traspaso_detalle td ON td.traspaso_id = t.id AND td.combinacion_id = c.id
  JOIN factura_interna fi ON fi.nro_factura = t.documento_ref
  JOIN factura_interna_detalle fid ON fid.factura_id = fi.id
  JOIN pedido_proveedor_detalle ppd ON ppd.id = fid.ppd_id
    AND ppd.linea = l.codigo_proveedor::text
    AND ppd.referencia = r.codigo_proveedor::text
    AND (
      ppd.descp_color = col.nombre
      OR ppd.id_color = c.color_id
    )
  WHERE t.almacen_destino_id = 1
    AND t.estado = 'CONFIRMADO'
  ORDER BY t.id DESC
  LIMIT 1
) ppd_trp ON true;

GRANT SELECT ON v_stock_web TO anon;
GRANT SELECT ON v_stock_web TO authenticated;

COMMENT ON VIEW v_stock_web IS
  'Catálogo web P0 + Stock Sano ALM_WEB_01. precio_web desde lista WEB o stock_sano_deposito.';
