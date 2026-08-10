/**
 * Gate Falta 1 / 4.05.03.004 — tras fix enrich:
 * para cada talle ALM con stock, precio_web efectivo = LPN_PPD × (1+markup%).
 * PASS si hay ≥2 precios efectivos distintos donde PPD tiene ≥2 LPN.
 */
import fs from "fs";
import pg from "pg";

function redondearCentenaGs(n) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100) * 100;
}
function webFromLpn(lpn, markup) {
  return redondearCentenaGs(Number(lpn) * (1 + Number(markup) / 100));
}

const env = fs.readFileSync(".env.local", "utf8");
const url = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!url) {
  console.error("FAIL sin DATABASE_URL");
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const q = await pool.query(`
  WITH alm AS (
    SELECT
      TRIM(v.linea_codigo) AS linea,
      TRIM(v.referencia_codigo) AS ref,
      TRIM(COALESCE(v.color_code::text, '')) AS color,
      TRIM(v.talla_codigo) AS talle,
      v.stock_web,
      COALESCE(v.stock_sano_markup_pct, 50)::float AS markup
    FROM v_stock_web v
    WHERE v.proveedor_importacion_id = 638
      AND coalesce(v.stock_web, 0) > 0
  ),
  priced AS (
    SELECT
      a.linea,
      a.ref,
      a.color,
      a.talle,
      a.stock_web,
      a.markup,
      ppd.precio_lpn::float AS lpn
    FROM alm a
    JOIN LATERAL (
      SELECT MAX(ppd.precio_lpn) AS precio_lpn
      FROM pedido_proveedor_detalle ppd
      WHERE TRIM(ppd.linea::text) = a.linea
        AND TRIM(COALESCE(ppd.referencia::text, '')) = a.ref
        AND (
          TRIM(COALESCE(ppd.color_code::text, '')) = a.color
          OR a.color = ''
        )
        AND UPPER(TRIM(ppd.am_talle::text)) = UPPER(a.talle)
    ) ppd ON ppd.precio_lpn IS NOT NULL AND ppd.precio_lpn > 0
  )
  SELECT
    linea,
    ref,
    color,
    count(*)::int AS tallas,
    count(DISTINCT lpn)::int AS lpns,
    array_agg(DISTINCT lpn ORDER BY lpn) AS lpns_arr
  FROM priced
  GROUP BY 1, 2, 3
  HAVING count(DISTINCT lpn) >= 2
  ORDER BY count(DISTINCT lpn) DESC
  LIMIT 15
`);

if (!q.rows.length) {
  console.error("FAIL: sin moléculas multi-LPN con stock+match PPD");
  await pool.end();
  process.exit(1);
}

let pass = 0;
let fail = 0;
for (const r of q.rows) {
  const detail = await pool.query(
    `
    SELECT TRIM(v.talla_codigo) AS talle,
           COALESCE(v.stock_sano_markup_pct, 50)::float AS markup,
           (
             SELECT MAX(ppd.precio_lpn)::float
             FROM pedido_proveedor_detalle ppd
             WHERE TRIM(ppd.linea::text) = $1
               AND TRIM(COALESCE(ppd.referencia::text,'')) = $2
               AND TRIM(COALESCE(ppd.color_code::text,'')) = $3
               AND UPPER(TRIM(ppd.am_talle::text)) = UPPER(TRIM(v.talla_codigo))
           ) AS lpn
    FROM v_stock_web v
    WHERE v.proveedor_importacion_id = 638
      AND TRIM(v.linea_codigo) = $1
      AND TRIM(v.referencia_codigo) = $2
      AND TRIM(COALESCE(v.color_code::text,'')) = $3
      AND coalesce(v.stock_web,0) > 0
    `,
    [r.linea, r.ref, r.color],
  );
  const webs = new Set();
  for (const t of detail.rows) {
    if (t.lpn > 0) webs.add(webFromLpn(t.lpn, t.markup));
  }
  const ok = webs.size >= 2;
  if (ok) pass++;
  else fail++;
  console.log(
    ok ? "PASS" : "FAIL",
    r.linea,
    r.ref,
    "color",
    r.color,
    "lpns",
    r.lpns_arr,
    "web_buckets",
    [...webs],
  );
}

console.log(`\nRESULTADO ${pass} PASS / ${fail} FAIL (de ${q.rows.length})`);
await pool.end();
process.exit(fail > 0 ? 1 : 0);
