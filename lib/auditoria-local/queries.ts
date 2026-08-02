/**
 * Cruce Depósito · Stock Sano · Catálogo + detalle molecular (pilares + tallas).
 * LOCAL ONLY. Venta Bazzar = caja abierta (pares/prendas por talla).
 */
import pg from 'pg'
import { esMediasORopa654 } from './medias654'
import { esTalle638Canonico, sortTalle638Key } from './grada638'
import type {
  AuditoriaLocalPayload,
  ColorBloque,
  DimRow,
  Hueco,
  MarcaBloque,
  ModeloDetalle,
  RamoBloque,
  TallaStock,
} from './types'

const ALM = 1
const TIPO = `CASE l.proveedor_id WHEN 654 THEN 'Calzado' WHEN 638 THEN 'Confecciones' ELSE '(sin tipo)' END`

type Agg = {
  dim: string
  dep_modelos: number
  dep_pares: string
  sano_modelos: number
  sano_pares: string
  web_modelos: number
  web_pares: string
}

type WebRow = {
  linea_id: number
  referencia_id: number
  material_id: number
  color_id: number
  combinacion_id: number
  linea: string
  referencia: string
  material: string
  color_code: string
  color_nombre: string
  marca: string
  estilo: string
  tipo_v2: string
  proveedor_id: number
  linea_desc: string | null
  referencia_desc: string | null
  material_desc: string | null
  tipo_1: string | null
  descp_tipo_1: string | null
  talla: string
  talla_orden: number
  stock_web: number
  precio_web: number | null
  /** PPD grada abierta — solo 638 cuando existe */
  am_talle: string | null
  grada_carlos: string | null
}

type DepTalla = {
  linea_id: number
  referencia_id: number
  material_id: number
  color_id: number
  talla: string
  pares: number
}

type SanoKey = {
  linea_id: number
  referencia_id: number
  material_id: number
  pares: number
}

function mapDim(rows: Agg[]): DimRow[] {
  return rows.map((r) => {
    const depM = Number(r.dep_modelos) || 0
    const sanoM = Number(r.sano_modelos) || 0
    const webM = Number(r.web_modelos) || 0
    const depP = Number(r.dep_pares) || 0
    const sanoP = Number(r.sano_pares) || 0
    const webP = Number(r.web_pares) || 0
    return {
      clave: r.dim || '(vacío)',
      deposito_modelos: depM,
      deposito_pares: depP,
      sano_modelos: sanoM,
      sano_pares: sanoP,
      web_modelos: webM,
      web_pares: webP,
      delta_modelos: webM - depM,
      delta_pares: webP - depP,
      ok: webM === depM && webP === depP && sanoM === depM,
    }
  })
}

const CTE = `
WITH dep AS (
  SELECT
    l.id AS linea_id, r.id AS referencia_id, COALESCE(c.material_id, 0) AS material_id,
    l.codigo_proveedor::text AS linea, r.codigo_proveedor::text AS referencia,
    COALESCE(NULLIF(btrim(mat.codigo_proveedor::text), ''), '0') AS material,
    COALESCE(mv.descp_marca, '—') AS marca,
    COALESCE(NULLIF(btrim(ge.descp_grupo_estilo::text), ''), '(sin estilo)') AS estilo,
    (${TIPO}) AS tipo_v2,
    SUM(md.cantidad * md.signo)::bigint AS pares
  FROM movimiento_detalle md
  JOIN movimiento m ON m.id = md.movimiento_id
  JOIN combinacion c ON c.id = md.combinacion_id
  JOIN linea l ON l.id = c.linea_id
  JOIN referencia r ON r.id = c.referencia_id
  LEFT JOIN material mat ON mat.id = c.material_id
  LEFT JOIN marca_v2 mv ON mv.id_marca = l.marca_id
  LEFT JOIN grupo_estilo_v2 ge ON ge.id_grupo_estilo = l.grupo_estilo_id
  WHERE m.almacen_destino_id = $1 AND m.estado = 'CONFIRMADO' AND m.tipo = 'INGRESO_COMPRA'
  GROUP BY l.id, r.id, c.material_id, l.codigo_proveedor, r.codigo_proveedor,
           mat.codigo_proveedor, mv.descp_marca, ge.descp_grupo_estilo, l.proveedor_id
  HAVING SUM(md.cantidad * md.signo) > 0
),
sano AS (
  SELECT d.* FROM dep d
  JOIN stock_sano_deposito ssd
    ON ssd.almacen_id = $1 AND ssd.linea_id = d.linea_id AND ssd.referencia_id = d.referencia_id
   AND ssd.material_id_key = d.material_id
  WHERE COALESCE(ssd.precio_venta, 0) > 0
),
web AS (
  SELECT v.linea_id, v.referencia_id, COALESCE(v.material_id, 0) AS material_id,
    v.linea_codigo::text AS linea, v.referencia_codigo::text AS referencia,
    COALESCE(NULLIF(btrim(v.material_code::text), ''), '0') AS material,
    COALESCE(v.marca, '—') AS marca,
    COALESCE(NULLIF(btrim(v.descp_grupo_estilo::text), ''), '(sin estilo)') AS estilo,
    (${TIPO}) AS tipo_v2,
    SUM(v.stock_web)::bigint AS pares
  FROM v_stock_web v
  JOIN linea l ON l.id = v.linea_id
  WHERE v.stock_web > 0 AND COALESCE(v.precio_web, 0) > 0 AND v.stock_sano_estado = 'SANO'
  GROUP BY v.linea_id, v.referencia_id, v.material_id, v.linea_codigo, v.referencia_codigo,
           v.material_code, v.marca, v.descp_grupo_estilo, l.proveedor_id
)
`

function getDbUrl(): string {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()
  if (!url) {
    throw new Error(
      'Auditoría local requiere DATABASE_URL en bazzar-web/.env.local (solo local · no deploy).',
    )
  }
  return url
}

function modelKey654(r: { linea_id: number; referencia_id: number; material_id: number }) {
  return `654:${r.linea_id}|${r.referencia_id}|${r.material_id}`
}

function modelKey638(r: {
  linea_id: number
  referencia_id: number
  material_id: number
  color_id: number
}) {
  return `638:${r.linea_id}|${r.referencia_id}|${r.material_id}|${r.color_id}`
}

/** Orden canónico: etiqueta numérica (35…43), no `talla_orden` de BD (puede venir cruzado). */
function compararTallaEtiqueta(a: string, b: string, ordenA = 0, ordenB = 0): number {
  const na = Number.parseFloat(String(a).replace(',', '.'))
  const nb = Number.parseFloat(String(b).replace(',', '.'))
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
  const lex = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  if (lex !== 0) return lex
  return ordenA - ordenB
}

function sortTallas(a: TallaStock, b: TallaStock) {
  return compararTallaEtiqueta(a.talla, b.talla, a.talla_orden, b.talla_orden)
}

/** Unión de tallas de todos los modelos de la marca. */
function gradaDeMarca(modelos: ModeloDetalle[]): { talla: string; talla_orden: number }[] {
  const is638 = modelos.some((m) => m.tipo_v2 === 'Confecciones')
  const map = new Map<string, number>()
  for (const m of modelos) {
    const lista =
      m.tipo_v2 === 'Confecciones'
        ? m.tallas
        : m.colores.flatMap((c) => c.tallas)
    for (const t of lista) {
      const prev = map.get(t.talla)
      if (prev == null || t.talla_orden < prev) map.set(t.talla, t.talla_orden)
    }
  }
  return Array.from(map.entries())
    .map(([talla, talla_orden]) => ({ talla, talla_orden }))
    .sort((a, b) => {
      // 638 Director: 1·2·3 → P·M·G·GG → 4·6·8·10…  |  654: serial numérico etiqueta
      if (is638) return a.talla_orden - b.talla_orden
      return compararTallaEtiqueta(a.talla, b.talla, a.talla_orden, b.talla_orden)
    })
}

/** Color ALM `K40093` → `40093` (match PPD `color_code`). */
function colorKey638(colorNombre: string | null | undefined, colorCode: string | null | undefined): string {
  const raw = String(colorNombre || colorCode || '')
    .trim()
    .toUpperCase()
  if (!raw || raw === '—') return ''
  const noK = raw.replace(/^K/, '')
  const trimmed = noK.replace(/^0+(\d)/, '$1')
  return trimmed || noK
}

type PpdTalleRow = {
  linea: string
  referencia: string
  color_code: string
  am_talle: string
  grada: string | null
  precio: number | null
  prendas: number
}

type PpdGradaIndex = {
  byLineaRefColor: Map<string, PpdTalleRow[]>
  byLineaColor: Map<string, PpdTalleRow[]>
  byLinea: Map<string, PpdTalleRow[]>
}

function buildPpdIndex(rows: PpdTalleRow[]): PpdGradaIndex {
  const byLineaRefColor = new Map<string, PpdTalleRow[]>()
  const byLineaColor = new Map<string, PpdTalleRow[]>()
  const byLinea = new Map<string, PpdTalleRow[]>()
  const push = (map: Map<string, PpdTalleRow[]>, key: string, row: PpdTalleRow) => {
    if (!key) return
    const arr = map.get(key)
    if (arr) arr.push(row)
    else map.set(key, [row])
  }
  for (const r of rows) {
    if (!esTalle638Canonico(r.am_talle)) continue
    const ck = colorKey638(null, r.color_code)
    push(byLineaRefColor, `${r.linea}|${r.referencia}|${ck}`, r)
    push(byLineaColor, `${r.linea}|${ck}`, r)
    push(byLinea, r.linea, r)
  }
  return { byLineaRefColor, byLineaColor, byLinea }
}

/** Grada Carlos desde PPD (F9 TC Tallas). Nunca pilar 34–39 de ALM_WEB. */
function lookupPpdTalles(
  index: PpdGradaIndex,
  linea: string,
  referencia: string,
  colorNombre: string | null | undefined,
  colorCode: string | null | undefined,
): PpdTalleRow[] {
  const ck = colorKey638(colorNombre, colorCode)
  const exact = index.byLineaRefColor.get(`${linea}|${referencia}|${ck}`)
  if (exact?.length) return exact
  const byColor = index.byLineaColor.get(`${linea}|${ck}`)
  if (byColor?.length) return byColor
  return index.byLinea.get(linea) || []
}

/** Reparte entero `total` en `n` partes (suma exacta). */
function splitIntEqual(total: number, n: number): number[] {
  if (n <= 0) return []
  const t = Math.max(0, Math.floor(total))
  const base = Math.floor(t / n)
  let rem = t - base * n
  const out = Array.from({ length: n }, () => base)
  for (let i = 0; i < rem; i++) out[i] += 1
  return out
}

/**
 * Grada 638 = talles PPD/F9 (am_talle).
 * Cantidad por celda = prendas ALM del modelo repartidas entre esos talles
 * (ALM no trae desglose am_talle; Σ celdas = Web/Dep del modelo).
 * Prohibido usar cantidad_pares PPD en celdas (rompe aritmética vs ALM).
 */
function attachTalles638FromPpd(acc: {
  meta: ModeloDetalle
  tallas638: Map<string, TallaStock>
  dep_acc: number
}, ppd: PpdGradaIndex) {
  const rows = lookupPpdTalles(
    ppd,
    acc.meta.linea,
    acc.meta.referencia,
    acc.meta.color_nombre,
    acc.meta.color_code,
  )
  acc.tallas638.clear()
  if (rows.length === 0) {
    acc.meta.stock_sin_grada_638 = {
      web: acc.meta.web_pares,
      dep: acc.dep_acc,
    }
    return
  }
  acc.meta.stock_sin_grada_638 = undefined
  const byTalle = new Map<string, TallaStock>()
  for (const r of rows) {
    const talle = String(r.am_talle).trim()
    if (!talle || byTalle.has(talle)) continue
    byTalle.set(talle, {
      talla: talle,
      talla_orden: sortTalle638Key(talle),
      stock_web: 0,
      stock_dep: 0,
      precio_web: r.precio != null ? Number(r.precio) : null,
      grada_carlos: r.grada,
      es_grada_638_valida: true,
    })
  }
  const ordered = Array.from(byTalle.values()).sort(
    (a, b) => sortTalle638Key(a.talla) - sortTalle638Key(b.talla),
  )
  const webParts = splitIntEqual(acc.meta.web_pares, ordered.length)
  const depParts = splitIntEqual(acc.dep_acc, ordered.length)
  ordered.forEach((row, i) => {
    row.stock_web = webParts[i] ?? 0
    row.stock_dep = depParts[i] ?? 0
    acc.tallas638.set(row.talla, row)
  })
}

function buildRamos(
  webRows: WebRow[],
  depMap: Map<string, number>,
  sanoMap: Map<string, number>,
  ppdIndex: PpdGradaIndex,
): RamoBloque[] {
  type Acc = {
    marca: string
    meta: ModeloDetalle
    colores: Map<string, ColorBloque>
    tallas638: Map<string, TallaStock>
    /** Depósito ALM acumulado (todas las tallas contaminadas 34–39 suman prendas) */
    dep_acc: number
  }

  const modelos = new Map<string, Acc>()

  for (const r of webRows) {
    const is638 = Number(r.proveedor_id) === 638
    const key = is638 ? modelKey638(r) : modelKey654(r)
    let acc = modelos.get(key)
    if (!acc) {
      acc = {
        marca: r.marca || '—',
        meta: {
          key,
          linea: r.linea,
          linea_desc: r.linea_desc,
          referencia: r.referencia,
          referencia_desc: r.referencia_desc,
          material: r.material,
          material_desc: r.material_desc,
          color_code: is638 ? r.color_code : null,
          color_nombre: is638 ? r.color_nombre : null,
          estilo: r.estilo,
          tipo_v2: is638 ? 'Confecciones' : 'Calzado',
          proveedor_id: Number(r.proveedor_id),
          es_medias_o_ropa_654: esMediasORopa654({
            proveedor_id: r.proveedor_id,
            marca: r.marca,
            tipo_1: r.tipo_1,
            descp_tipo_1: r.descp_tipo_1,
            linea: r.linea,
            material_desc: r.material_desc,
          }),
          en_dep: false,
          en_sano: false,
          en_web: true,
          dep_pares: 0,
          sano_pares: null,
          web_pares: 0,
          ok_stock: false,
          ok_grada: true,
          ok: false,
          colores: [],
          tallas: [],
          stock_sin_grada_638: undefined,
        },
        colores: new Map(),
        tallas638: new Map(),
        dep_acc: 0,
      }
      modelos.set(key, acc)
    }

    const depKey = `${r.linea_id}|${r.referencia_id}|${r.material_id}|${r.color_id}|${r.talla}`
    const stock_web = Number(r.stock_web) || 0
    const stock_dep = depMap.get(depKey) || 0
    const precio_web = r.precio_web != null ? Number(r.precio_web) : null
    acc.meta.web_pares += stock_web

    if (is638) {
      // Stock ALM cuantitativo; grada 638 = PPD am_talle / TC Tallas (F9), no talla_codigo 34–39.
      acc.dep_acc += stock_dep
    } else {
      const talla: TallaStock = {
        talla: r.talla,
        talla_orden: Number(r.talla_orden) || 0,
        stock_web,
        stock_dep,
        precio_web,
      }
      const ck = r.color_code || String(r.color_id)
      let col = acc.colores.get(ck)
      if (!col) {
        col = {
          color_code: r.color_code,
          color_nombre: r.color_nombre || r.color_code,
          tallas: [],
          pares_web: 0,
        }
        acc.colores.set(ck, col)
      }
      const existing = col.tallas.find((t) => t.talla === talla.talla)
      if (existing) {
        existing.stock_web += talla.stock_web
        existing.stock_dep += talla.stock_dep
      } else col.tallas.push(talla)
      col.pares_web += talla.stock_web
    }
  }

  const ramoMaps = new Map<'Calzado' | 'Confecciones', Map<string, ModeloDetalle[]>>()

  for (const acc of Array.from(modelos.values())) {
    if (acc.meta.tipo_v2 === 'Confecciones') {
      attachTalles638FromPpd(acc, ppdIndex)
    }

    const parts = acc.meta.key.split(':')[1].split('|')
    const lrm = `${parts[0]}|${parts[1]}|${parts[2]}`
    const sano_pares = sanoMap.has(lrm) ? sanoMap.get(lrm)! : null
    let dep_pares = 0
    if (acc.meta.tipo_v2 === 'Confecciones') {
      // Stock ALM (Dep↔Web); tallas PPD son semántica de grada, no suman el cruce.
      dep_pares = acc.dep_acc
    } else {
      for (const c of acc.colores.values()) for (const t of c.tallas) dep_pares += t.stock_dep
    }

    const sinGrada638 = (acc.meta.stock_sin_grada_638?.web || 0) > 0
    const ok_stock =
      dep_pares > 0 && sano_pares != null && dep_pares === acc.meta.web_pares
    const ok_grada =
      acc.meta.tipo_v2 === 'Confecciones' ? acc.tallas638.size > 0 && !sinGrada638 : true
    const detalle: ModeloDetalle = {
      ...acc.meta,
      en_dep: dep_pares > 0,
      en_sano: sano_pares != null,
      en_web: acc.meta.web_pares > 0,
      dep_pares,
      sano_pares,
      ok_stock,
      ok_grada,
      ok: ok_stock && ok_grada,
      colores: Array.from(acc.colores.values()).map((c) => ({
        ...c,
        tallas: [...c.tallas].sort(sortTallas),
      })),
      tallas: Array.from(acc.tallas638.values()).sort(
        (a, b) => sortTalle638Key(a.talla) - sortTalle638Key(b.talla),
      ),
    }

    if (!ramoMaps.has(detalle.tipo_v2)) ramoMaps.set(detalle.tipo_v2, new Map())
    const mm = ramoMaps.get(detalle.tipo_v2)!
    if (!mm.has(acc.marca)) mm.set(acc.marca, [])
    mm.get(acc.marca)!.push(detalle)
  }

  const out: RamoBloque[] = []
  for (const tipo of ['Calzado', 'Confecciones'] as const) {
    const mm = ramoMaps.get(tipo)
    if (!mm) {
      out.push({
        tipo_v2: tipo,
        proveedor_id: tipo === 'Calzado' ? 654 : 638,
        modelos: 0,
        pares_web: 0,
        pares_dep: 0,
        ok_stock: true,
        ok_grada: true,
        ok: true,
        alerta_grada: null,
        marcas: [],
      })
      continue
    }
    const marcas: MarcaBloque[] = Array.from(mm.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([marca, modelos_detalle]) => {
        modelos_detalle.sort(
          (a, b) =>
            a.linea.localeCompare(b.linea, undefined, { numeric: true }) ||
            a.referencia.localeCompare(b.referencia, undefined, { numeric: true }),
        )
        const pares_web = modelos_detalle.reduce((s, m) => s + m.web_pares, 0)
        const pares_dep = modelos_detalle.reduce((s, m) => s + m.dep_pares, 0)
        const ok_stock = modelos_detalle.every((m) => m.ok_stock)
        const ok_grada = modelos_detalle.every((m) => m.ok_grada)
        return {
          marca,
          modelos: modelos_detalle.length,
          pares_web,
          pares_dep,
          ok_stock,
          ok_grada,
          ok: ok_stock && ok_grada,
          tiene_medias_ropa: modelos_detalle.some((m) => m.es_medias_o_ropa_654),
          grada: gradaDeMarca(modelos_detalle),
          modelos_detalle,
        }
      })
    const ok_stock = marcas.every((m) => m.ok_stock)
    const ok_grada = marcas.every((m) => m.ok_grada)
    const sinAm = marcas.some((m) =>
      m.modelos_detalle.some((d) => (d.stock_sin_grada_638?.web || 0) > 0),
    )
    out.push({
      tipo_v2: tipo,
      proveedor_id: tipo === 'Calzado' ? 654 : 638,
      modelos: marcas.reduce((s, m) => s + m.modelos, 0),
      pares_web: marcas.reduce((s, m) => s + m.pares_web, 0),
      pares_dep: marcas.reduce((s, m) => s + m.pares_dep, 0),
      ok_stock,
      ok_grada,
      ok: ok_stock && ok_grada,
      alerta_grada:
        tipo === 'Confecciones' && sinAm
          ? 'Hay modelos ALM sin match PPD am_talle. Canónico = TC Tallas F9 / PPD (1(1)1 · P(1)P). Prohibido usar talla_codigo 34–39 de ALM como talle ropa.'
          : null,
      marcas,
    })
  }
  return out
}

export async function getAuditoriaLocalCruce(): Promise<AuditoriaLocalPayload> {
  const client = new pg.Client({
    connectionString: getDbUrl(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    const runDim = async (col: 'tipo_v2' | 'marca' | 'estilo') => {
      const { rows } = await client.query<Agg>(
        `
        ${CTE}
        , unidos AS (
          SELECT
            COALESCE(d.marca, s.marca, w.marca, '—') AS marca,
            COALESCE(d.estilo, s.estilo, w.estilo, '(sin estilo)') AS estilo,
            COALESCE(d.tipo_v2, s.tipo_v2, w.tipo_v2, '(sin tipo)') AS tipo_v2,
            (d.linea_id IS NOT NULL) AS en_dep,
            (s.linea_id IS NOT NULL) AS en_sano,
            (w.linea_id IS NOT NULL) AS en_web,
            COALESCE(d.pares, 0) AS dep_pares,
            COALESCE(s.pares, 0) AS sano_pares,
            COALESCE(w.pares, 0) AS web_pares
          FROM dep d
          FULL OUTER JOIN sano s
            ON s.linea_id = d.linea_id AND s.referencia_id = d.referencia_id AND s.material_id = d.material_id
          FULL OUTER JOIN web w
            ON w.linea_id = COALESCE(d.linea_id, s.linea_id)
           AND w.referencia_id = COALESCE(d.referencia_id, s.referencia_id)
           AND w.material_id = COALESCE(d.material_id, s.material_id)
        )
        SELECT
          COALESCE(${col}::text, '(vacío)') AS dim,
          COUNT(*) FILTER (WHERE en_dep)::int AS dep_modelos,
          COALESCE(SUM(dep_pares) FILTER (WHERE en_dep), 0)::text AS dep_pares,
          COUNT(*) FILTER (WHERE en_sano)::int AS sano_modelos,
          COALESCE(SUM(sano_pares) FILTER (WHERE en_sano), 0)::text AS sano_pares,
          COUNT(*) FILTER (WHERE en_web)::int AS web_modelos,
          COALESCE(SUM(web_pares) FILTER (WHERE en_web), 0)::text AS web_pares
        FROM unidos
        GROUP BY 1 ORDER BY 1
        `,
        [ALM],
      )
      return mapDim(rows)
    }

    // Un solo client pg: consultas en serie (pg@9 depreca query concurrente).
    const por_tipo_v2 = await runDim('tipo_v2')
    const por_marca = await runDim('marca')
    const por_estilo = await runDim('estilo')
    const huecosRes = await client.query<{
      linea: string
      referencia: string
      material: string
      marca: string
      estilo: string
      tipo_v2: string
      dep_pares: string
      sano_pares: string | null
      web_pares: string | null
      en_sano: boolean
      en_web: boolean
    }>(
      `
          ${CTE}
          SELECT d.linea, d.referencia, d.material, d.marca, d.estilo, d.tipo_v2,
            d.pares::text AS dep_pares, s.pares::text AS sano_pares, w.pares::text AS web_pares,
            (s.linea_id IS NOT NULL) AS en_sano, (w.linea_id IS NOT NULL) AS en_web
          FROM dep d
          LEFT JOIN sano s ON s.linea_id=d.linea_id AND s.referencia_id=d.referencia_id AND s.material_id=d.material_id
          LEFT JOIN web w ON w.linea_id=d.linea_id AND w.referencia_id=d.referencia_id AND w.material_id=d.material_id
          WHERE s.linea_id IS NULL OR w.linea_id IS NULL OR COALESCE(w.pares,0) <> d.pares
          ORDER BY CASE WHEN w.linea_id IS NULL THEN 0 WHEN s.linea_id IS NULL THEN 1 ELSE 2 END,
                   d.marca, d.linea LIMIT 200
          `,
      [ALM],
    )
    const webDet = await client.query<WebRow>(
      `
          SELECT
            v.linea_id, v.referencia_id, COALESCE(v.material_id, 0)::int AS material_id,
            COALESCE(v.color_id, 0)::int AS color_id, v.combinacion_id,
            v.linea_codigo::text AS linea, v.referencia_codigo::text AS referencia,
            COALESCE(NULLIF(btrim(v.material_code::text), ''), '0') AS material,
            COALESCE(NULLIF(btrim(v.color_code::text), ''), '0') AS color_code,
            COALESCE(NULLIF(btrim(v.color_nombre::text), ''), COALESCE(v.color_code::text, '—')) AS color_nombre,
            COALESCE(v.marca, '—') AS marca,
            COALESCE(
              NULLIF(btrim(v.descp_grupo_estilo::text), ''),
              NULLIF(btrim(lr.descp_grupo_estilo::text), ''),
              NULLIF(btrim(ge.descp_grupo_estilo::text), ''),
              '(sin estilo)'
            ) AS estilo,
            (${TIPO}) AS tipo_v2,
            COALESCE(l.proveedor_id, 654)::int AS proveedor_id,
            NULLIF(btrim(v.linea_descripcion::text), '') AS linea_desc,
            NULLIF(btrim(v.referencia_descripcion::text), '') AS referencia_desc,
            NULLIF(btrim(v.material_descripcion::text), '') AS material_desc,
            COALESCE(
              NULLIF(btrim(t1.descp_tipo_1::text), ''),
              NULLIF(btrim(lr.descp_tipo_1::text), '')
            ) AS tipo_1,
            COALESCE(
              NULLIF(btrim(t1.descp_tipo_1::text), ''),
              NULLIF(btrim(lr.descp_tipo_1::text), '')
            ) AS descp_tipo_1,
            COALESCE(v.talla_codigo::text, '—') AS talla,
            COALESCE(v.talla_orden, 0)::int AS talla_orden,
            v.stock_web::float8 AS stock_web,
            v.precio_web::float8 AS precio_web,
            NULL::text AS am_talle,
            NULL::text AS grada_carlos
          FROM v_stock_web v
          JOIN linea l ON l.id = v.linea_id
          LEFT JOIN linea_referencia lr ON lr.linea_id = v.linea_id AND lr.referencia_id = v.referencia_id
          LEFT JOIN grupo_estilo_v2 ge ON ge.id_grupo_estilo = COALESCE(v.grupo_estilo_id, l.grupo_estilo_id, lr.grupo_estilo_id)
          LEFT JOIN tipo_1 t1 ON t1.id_tipo_1 = lr.tipo_1_id
          WHERE v.stock_web > 0 AND COALESCE(v.precio_web, 0) > 0 AND v.stock_sano_estado = 'SANO'
          ORDER BY v.marca, v.linea_codigo, v.referencia_codigo, v.color_code, v.talla_orden
          `,
    )

    const lineas638 = Array.from(
      new Set(
        webDet.rows
          .filter((r) => Number(r.proveedor_id) === 638)
          .map((r) => String(r.linea).trim())
          .filter(Boolean),
      ),
    )
    const ppdRes =
      lineas638.length === 0
        ? { rows: [] as PpdTalleRow[] }
        : await client.query<PpdTalleRow>(
            `
          SELECT
            TRIM(ppd.linea::text) AS linea,
            TRIM(COALESCE(ppd.referencia::text, '')) AS referencia,
            TRIM(COALESCE(ppd.color_code::text, '')) AS color_code,
            TRIM(ppd.am_talle::text) AS am_talle,
            NULLIF(TRIM(ppd.grada::text), '') AS grada,
            ppd.precio_lpn::float8 AS precio,
            SUM(COALESCE(ppd.cantidad_pares, 0))::float8 AS prendas
          FROM pedido_proveedor_detalle ppd
          WHERE ppd.am_talle IS NOT NULL
            AND TRIM(ppd.am_talle::text) <> ''
            AND TRIM(ppd.linea::text) = ANY($1::text[])
          GROUP BY 1, 2, 3, 4, 5, 6
          `,
            [lineas638],
          )
    const ppdIndex = buildPpdIndex(ppdRes.rows)
    const depDet = await client.query<DepTalla>(
      `
          SELECT
            l.id AS linea_id, r.id AS referencia_id, COALESCE(c.material_id, 0)::int AS material_id,
            COALESCE(c.color_id, 0)::int AS color_id,
            COALESCE(tl.talla_etiqueta::text, '—') AS talla,
            SUM(md.cantidad * md.signo)::float8 AS pares
          FROM movimiento_detalle md
          JOIN movimiento m ON m.id = md.movimiento_id
          JOIN combinacion c ON c.id = md.combinacion_id
          JOIN linea l ON l.id = c.linea_id
          JOIN referencia r ON r.id = c.referencia_id
          JOIN talla tl ON tl.id = c.talla_id
          WHERE m.almacen_destino_id = $1 AND m.estado = 'CONFIRMADO' AND m.tipo = 'INGRESO_COMPRA'
          GROUP BY l.id, r.id, c.material_id, c.color_id, tl.talla_etiqueta
          HAVING SUM(md.cantidad * md.signo) > 0
          `,
      [ALM],
    )
    const sanoDet = await client.query<SanoKey>(
      `
          SELECT
            ssd.linea_id, ssd.referencia_id, ssd.material_id_key::int AS material_id,
            COALESCE((
              SELECT SUM(md.cantidad * md.signo)::float8
              FROM movimiento_detalle md
              JOIN movimiento m ON m.id = md.movimiento_id
              JOIN combinacion c ON c.id = md.combinacion_id
              WHERE m.almacen_destino_id = $1 AND m.estado = 'CONFIRMADO' AND m.tipo = 'INGRESO_COMPRA'
                AND c.linea_id = ssd.linea_id AND c.referencia_id = ssd.referencia_id
                AND COALESCE(c.material_id, 0) = ssd.material_id_key
            ), 0)::float8 AS pares
          FROM stock_sano_deposito ssd
          WHERE ssd.almacen_id = $1 AND COALESCE(ssd.precio_venta, 0) > 0
          `,
      [ALM],
    )

    const huecos: Hueco[] = huecosRes.rows.map((r) => {
      let problema: Hueco['problema'] = 'pares_diff'
      if (!r.en_web && !r.en_sano) problema = 'solo_deposito'
      else if (!r.en_web) problema = 'sin_web'
      else if (!r.en_sano) problema = 'sin_sano'
      return {
        linea: r.linea,
        referencia: r.referencia,
        material: r.material,
        marca: r.marca,
        estilo: r.estilo,
        tipo_v2: r.tipo_v2,
        deposito_pares: Number(r.dep_pares) || 0,
        sano_pares: r.sano_pares != null ? Number(r.sano_pares) : null,
        web_pares: r.web_pares != null ? Number(r.web_pares) : null,
        problema,
      }
    })

    const totales = {
      deposito_modelos: por_tipo_v2.reduce((s, r) => s + r.deposito_modelos, 0),
      deposito_pares: por_tipo_v2.reduce((s, r) => s + r.deposito_pares, 0),
      sano_modelos: por_tipo_v2.reduce((s, r) => s + r.sano_modelos, 0),
      sano_pares: por_tipo_v2.reduce((s, r) => s + r.sano_pares, 0),
      web_modelos: por_tipo_v2.reduce((s, r) => s + r.web_modelos, 0),
      web_pares: por_tipo_v2.reduce((s, r) => s + r.web_pares, 0),
    }

    const depMap = new Map<string, number>()
    for (const d of depDet.rows) {
      const k = `${d.linea_id}|${d.referencia_id}|${d.material_id}|${d.color_id}|${d.talla}`
      depMap.set(k, (depMap.get(k) || 0) + Number(d.pares))
    }
    const sanoMap = new Map<string, number>()
    for (const s of sanoDet.rows) {
      sanoMap.set(`${s.linea_id}|${s.referencia_id}|${s.material_id}`, Number(s.pares) || 0)
    }

    const ramos = buildRamos(webDet.rows, depMap, sanoMap, ppdIndex)
    const bloqueantes = huecos.filter(
      (h) => h.problema === 'sin_web' || h.problema === 'solo_deposito',
    ).length
    const ok_stock =
      totales.deposito_modelos === totales.web_modelos &&
      totales.deposito_pares === totales.web_pares &&
      bloqueantes === 0 &&
      ramos.every((r) => r.ok_stock)
    const ok_grada_638 = ramos
      .filter((r) => r.tipo_v2 === 'Confecciones')
      .every((r) => r.ok_grada)

    return {
      ok: ok_stock && ok_grada_638,
      ok_stock,
      ok_grada_638,
      generado_en: new Date().toISOString(),
      nota:
        'LOCAL ONLY · 654 curva pares · 638 grada PPD/F9 (am_talle×precio) · no deploy',
      totales,
      por_tipo_v2,
      por_marca,
      por_estilo,
      huecos,
      ramos,
    }
  } finally {
    await client.end()
  }
}
