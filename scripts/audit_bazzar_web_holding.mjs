/**
 * Auditoría integral Bazzar Web — brazo ejecutor (anti–Falta 1).
 * Exit 0 = sin DEUDA crítica · Exit 1 = hay FAIL · Exit 2 = DEUDA conocida documentada
 */
import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const url = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!url) {
  console.error("FATAL sin DATABASE_URL");
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const findings = [];
function add(sev, code, msg, detail = null) {
  findings.push({ sev, code, msg, detail });
  const tag = sev === "FAIL" ? "❌" : sev === "DEUDA" ? "🟡" : sev === "WARN" ? "⚠" : "✅";
  console.log(`${tag} [${code}] ${msg}`);
  if (detail) console.log("   ", typeof detail === "string" ? detail : JSON.stringify(detail));
}

function redondearCentenaGs(n) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100) * 100;
}
function webFromLpn(lpn, markup) {
  return redondearCentenaGs(Number(lpn) * (1 + Number(markup || 50) / 100));
}

console.log("═══ AUDITORÍA BAZZAR WEB HOLDING ═══\n");

// ── 1 · Universo catálogo ──
const uni = await pool.query(`
  SELECT
    count(*)::int AS filas,
    count(*) FILTER (WHERE proveedor_importacion_id=638)::int AS f638,
    count(*) FILTER (WHERE proveedor_importacion_id=654)::int AS f654,
    count(DISTINCT linea_id)::int AS lineas,
    count(*) FILTER (WHERE coalesce(stock_web,0)>0)::int AS con_stock,
    count(*) FILTER (WHERE coalesce(stock_web,0)>0 AND (precio_web IS NULL OR precio_web<=0))::int AS stock_sin_precio,
    count(*) FILTER (WHERE coalesce(stock_web,0)>0 AND proveedor_importacion_id=638)::int AS stock_638,
    count(*) FILTER (WHERE coalesce(stock_web,0)>0 AND proveedor_importacion_id=654)::int AS stock_654
  FROM v_stock_web
`);
console.log("1 · UNIVERSO v_stock_web", uni.rows[0]);
if (uni.rows[0].stock_sin_precio > 0) {
  add("FAIL", "PRECIO_NULL", "Filas con stock y sin precio_web", uni.rows[0].stock_sin_precio);
} else {
  add("PASS", "PRECIO_NULL", "Sin stock huérfano de precio");
}

// ── 2 · Error 4.05.03.004 mapeo + gate post-fix ──
console.log("\n2 · MAPA ERROR 638 precio×talle (4.05.03.004)");
const map638 = await pool.query(`
  WITH alm AS (
    SELECT TRIM(v.linea_codigo) linea, TRIM(v.referencia_codigo) ref,
           TRIM(COALESCE(v.color_code::text,'')) color,
           TRIM(v.talla_codigo) talle,
           v.precio_web::float AS precio_alm,
           COALESCE(v.stock_sano_markup_pct,50)::float markup,
           v.stock_web
    FROM v_stock_web v
    WHERE v.proveedor_importacion_id=638 AND coalesce(v.stock_web,0)>0
  ),
  priced AS (
    SELECT a.*,
      (SELECT MAX(ppd.precio_lpn)::float
       FROM pedido_proveedor_detalle ppd
       WHERE TRIM(ppd.linea::text)=a.linea
         AND TRIM(COALESCE(ppd.referencia::text,''))=a.ref
         AND (TRIM(COALESCE(ppd.color_code::text,''))=a.color OR a.color='')
         AND UPPER(TRIM(ppd.am_talle::text))=UPPER(a.talle)
      ) AS lpn_ppd
    FROM alm a
  )
  SELECT linea, ref, color,
         count(*)::int tallas,
         count(DISTINCT lpn_ppd)::int lpns_ppd,
         count(DISTINCT precio_alm)::int precios_alm_crudos,
         array_agg(DISTINCT talle ORDER BY talle) talles,
         array_agg(DISTINCT lpn_ppd ORDER BY lpn_ppd) FILTER (WHERE lpn_ppd IS NOT NULL) lpns,
         array_agg(DISTINCT precio_alm ORDER BY precio_alm) precios_alm
  FROM priced
  GROUP BY 1,2,3
  HAVING count(DISTINCT lpn_ppd) >= 2
  ORDER BY 5 DESC
`);

let fixOk = 0;
let fixFail = 0;
const ejemplos = [];
for (const r of map638.rows) {
  const webs = new Set();
  const detail = await pool.query(
    `
    SELECT TRIM(v.talla_codigo) talle, v.precio_web::float precio_alm,
           COALESCE(v.stock_sano_markup_pct,50)::float markup,
           (SELECT MAX(ppd.precio_lpn)::float FROM pedido_proveedor_detalle ppd
            WHERE TRIM(ppd.linea::text)=$1 AND TRIM(COALESCE(ppd.referencia::text,''))=$2
              AND TRIM(COALESCE(ppd.color_code::text,''))=$3
              AND UPPER(TRIM(ppd.am_talle::text))=UPPER(TRIM(v.talla_codigo))) lpn
    FROM v_stock_web v
    WHERE proveedor_importacion_id=638 AND coalesce(stock_web,0)>0
      AND TRIM(linea_codigo)=$1 AND TRIM(referencia_codigo)=$2
      AND TRIM(COALESCE(color_code::text,''))=$3
    `,
    [r.linea, r.ref, r.color],
  );
  for (const t of detail.rows) {
    if (t.lpn > 0) webs.add(webFromLpn(t.lpn, t.markup));
  }
  const ok = webs.size >= 2;
  if (ok) fixOk++;
  else fixFail++;
  if (ejemplos.length < 5) {
    ejemplos.push({
      linea: r.linea,
      ref: r.ref,
      color: r.color,
      talles: r.talles,
      lpns_ppd: r.lpns,
      precios_alm_crudos: r.precios_alm,
      buckets_post_fix: [...webs],
      estado: ok ? "FIX_OK" : "FIX_FAIL",
    });
  }
}
console.log("   moléculas multi-LPN con stock:", map638.rows.length);
console.log("   post-fix (LPN×markup) PASS/FAIL:", fixOk, "/", fixFail);
for (const e of ejemplos) console.log("   ·", e);
if (map638.rows.length === 0) {
  add("WARN", "638_MULTI", "No hay multi-LPN con stock para mapear (catálogo chico)");
} else if (fixFail === 0) {
  add("PASS", "638_MULTI", `Enrich ley OK en ${fixOk} moléculas multi-LPN (ALM crudo seguía mono)`);
} else {
  add("FAIL", "638_MULTI", `${fixFail} moléculas no generan buckets tras ley PPD`);
}

// ── 3 · Contaminación grada 34–39 en 638 ──
console.log("\n3 · GRADA 638 vs contaminación 654");
const cont = await pool.query(`
  SELECT count(*)::int n,
         count(*) FILTER (
           WHERE talla_codigo ~ '^[0-9]+$'
             AND talla_codigo::int BETWEEN 33 AND 45
         )::int contaminadas
  FROM v_stock_web
  WHERE proveedor_importacion_id=638 AND coalesce(stock_web,0)>0
`);
const c = cont.rows[0];
if (c.contaminadas > 0) {
  add("DEUDA", "638_TALLA_654", `${c.contaminadas}/${c.n} filas stock 638 con talla 33–45 (calzado)`, c);
} else {
  add("PASS", "638_TALLA_654", "Sin tallas 33–45 en stock 638");
}

// ── 4 · Match PPD am_talle ──
const match = await pool.query(`
  SELECT
    count(*)::int stock_638,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM pedido_proveedor_detalle ppd
        WHERE TRIM(ppd.linea::text)=TRIM(v.linea_codigo)
          AND TRIM(COALESCE(ppd.referencia::text,''))=TRIM(v.referencia_codigo)
          AND UPPER(TRIM(ppd.am_talle::text))=UPPER(TRIM(v.talla_codigo))
          AND ppd.am_talle IS NOT NULL
      )
    )::int con_ppd_talle
  FROM v_stock_web v
  WHERE proveedor_importacion_id=638 AND coalesce(stock_web,0)>0
`);
const m = match.rows[0];
const pct = m.stock_638 ? Math.round((100 * m.con_ppd_talle) / m.stock_638) : 0;
if (pct < 80) {
  add("DEUDA", "638_PPD_MATCH", `Solo ${pct}% stock 638 matchea am_talle PPD`, m);
} else {
  add("PASS", "638_PPD_MATCH", `${pct}% stock 638 con am_talle PPD`, m);
}

// ── 5 · Imágenes (muestra) ──
console.log("\n4 · IMAGEN / marca");
const img = await pool.query(`
  SELECT
    count(*) FILTER (WHERE coalesce(stock_web,0)>0)::int con_stock,
    count(*) FILTER (WHERE coalesce(stock_web,0)>0 AND (imagen_url IS NULL OR imagen_url=''))::int sin_url,
    count(DISTINCT marca) FILTER (WHERE coalesce(stock_web,0)>0)::int marcas
  FROM v_stock_web
`);
add(
  img.rows[0].sin_url > img.rows[0].con_stock * 0.5 ? "WARN" : "PASS",
  "IMAGEN_URL",
  `sin imagen_url: ${img.rows[0].sin_url}/${img.rows[0].con_stock} · marcas ${img.rows[0].marcas}`,
);

// ── 6 · Marcas vacías / basura ──
const marcas = await pool.query(`
  SELECT coalesce(nullif(trim(marca),''),'(vacío)') marca, count(*)::int n
  FROM v_stock_web WHERE coalesce(stock_web,0)>0
  GROUP BY 1 ORDER BY 2 DESC LIMIT 15
`);
const vacias = marcas.rows.filter((r) => r.marca === "(vacío)" || r.marca === "—");
if (vacias.length) add("WARN", "MARCA", "Marcas vacías en stock", vacias);
else add("PASS", "MARCA", "Top marcas OK", marcas.rows.slice(0, 5));

// ── 7 · Confecciones agregadas (modelos) ──
const modelos = await pool.query(`
  SELECT count(DISTINCT linea_id::text||'-'||referencia_id::text||'-'||material_id::text)::int modelos_638
  FROM v_stock_web
  WHERE proveedor_importacion_id=638 AND coalesce(stock_web,0)>0
`);
add("PASS", "MODELOS_638", `${modelos.rows[0].modelos_638} modelos L+R+M con stock`);

// ── 8 · HTTP rutas críticas ──
console.log("\n5 · HTTP localhost:3002");
const routes = [
  "/inicio",
  "/catalogo",
  "/catalogo?ramo_tipo=CONFECCIONES",
  "/catalogo?ramo_tipo=CALZADO",
  "/catalogo?ramo_tipo=CONFECCIONES&q=1000077",
];
for (const path of routes) {
  try {
    const res = await fetch(`http://localhost:3002${path}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) add("PASS", "HTTP", path, res.status);
    else add("FAIL", "HTTP", path, res.status);
  } catch (e) {
    add("FAIL", "HTTP", path, e.message);
  }
}

// ── Resumen ──
console.log("\n═══ RESUMEN ═══");
const counts = { FAIL: 0, DEUDA: 0, WARN: 0, PASS: 0 };
for (const f of findings) counts[f.sev] = (counts[f.sev] || 0) + 1;
console.log(counts);
console.log("\nMAPA ERROR 638 (ejemplos):");
for (const e of ejemplos) {
  console.log(
    `  ${e.linea}/${e.ref} color ${e.color}: ALM crudo ${JSON.stringify(e.precios_alm_crudos)} → buckets ley ${JSON.stringify(e.buckets_post_fix)} [${e.estado}]`,
  );
}

await pool.end();
if (counts.FAIL > 0) process.exit(1);
if (counts.DEUDA > 0) process.exit(2);
process.exit(0);
