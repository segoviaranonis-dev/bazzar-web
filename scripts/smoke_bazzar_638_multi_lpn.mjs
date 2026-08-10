/**
 * Gate anti–Falta 1 (`5.01.00.027` / `4.05.03.004`):
 * Artículos 638 con ≥2 LPN en PPD y stock en v_stock_web deben tener
 * ≥2 precio_web distintos (si no → DEUDA / exit 2).
 */
import fs from "fs";
import pg from "pg";

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
  WITH ppd_multi AS (
    SELECT
      TRIM(ppd.linea::text) AS linea,
      TRIM(COALESCE(ppd.referencia::text, '')) AS ref,
      count(DISTINCT ppd.precio_lpn)::int AS lpns_ppd
    FROM pedido_proveedor_detalle ppd
    WHERE ppd.am_talle IS NOT NULL
      AND coalesce(ppd.precio_lpn, 0) > 0
    GROUP BY 1, 2
    HAVING count(DISTINCT ppd.precio_lpn) >= 2
  ),
  alm AS (
    SELECT
      TRIM(linea_codigo) AS linea,
      TRIM(referencia_codigo) AS ref,
      count(DISTINCT precio_web)::int AS precios_alm,
      sum(stock_web)::int AS stock
    FROM v_stock_web
    WHERE proveedor_importacion_id = 638
      AND coalesce(stock_web, 0) > 0
    GROUP BY 1, 2
  )
  SELECT p.linea, p.ref, p.lpns_ppd, a.precios_alm, a.stock
  FROM ppd_multi p
  JOIN alm a ON a.linea = p.linea AND a.ref = p.ref
  ORDER BY p.lpns_ppd DESC
  LIMIT 20
`);

if (!q.rows.length) {
  console.error("FAIL: no hay cruce PPD multi-LPN ∩ ALM con stock (¿catálogo vacío?)");
  await pool.end();
  process.exit(1);
}

let deuda = 0;
for (const r of q.rows) {
  const ok = Number(r.precios_alm) >= 2;
  if (!ok) deuda++;
  console.log(
    ok ? "PASS" : "DEUDA",
    r.linea,
    r.ref,
    "ppd_lpns=",
    r.lpns_ppd,
    "alm_precios=",
    r.precios_alm,
    "stock=",
    r.stock
  );
}

console.log(
  deuda > 0
    ? `\nFalta 1 VIGENTE: ${deuda}/${q.rows.length} con multi-LPN PPD y ALM mono-precio — 4.05.03.004`
    : "\nPASS: ALM multi-precio donde PPD multi y hay stock"
);

await pool.end();
process.exit(deuda > 0 ? 2 : 0);
