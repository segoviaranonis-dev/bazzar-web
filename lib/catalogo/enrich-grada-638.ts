/**
 * Catálogo Bazzar — grada ropa caja abierta:
 * - 638 Kyly → PPD am_talle + precio_lpn (paridad rimec agruparTallasPorPrecio)
 * - 654 PRENDAS (ACTVITTA ACT ROPAS) → PE v_stock_pe_rimec.grada (PPD am_talle suele vacío)
 * Prohibido pintar talla_codigo ALM 34–39 como talle ropa.
 * Error 4.05.03.004 / Falta 1: no aplastar multi-LPN a un precio_web.
 */
import pg from 'pg'
import {
  esTalle638Canonico,
  parseGradaAbierta638,
  pareceCurvaCalzado654,
  sortTalle638Key,
} from '@/lib/auditoria-local/grada638'

export type TallaCatalogo = {
  combinacion_id: number
  codigo: string
  orden: number
  stock: number
  /** Precio WEB de la combinación (segmentación 638) */
  precio_web?: number | null
}

export type PpdTalleRow = {
  linea: string
  referencia: string
  color_code: string
  am_talle: string
  precio_lpn: string | number | null
}

/** linea|ref|color → am_talle[] */
export type PpdAmTalleIndex = Map<string, string[]>
/** linea|ref|color|talle → precio_lpn */
export type PpdLpnPorTalleIndex = Map<string, number>

export type Ppd638Enrich = {
  amTalles: PpdAmTalleIndex
  lpnPorTalle: PpdLpnPorTalleIndex
}

function redondearCentenaGs(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n / 100) * 100
}

/** LPN PPD → precio_web Bazzar (markup stock sano o factor inferido). */
export function lpnAPrecioWeb638(
  lpn: number,
  markupPct: number | null | undefined,
  factorFallback?: number | null,
): number {
  const base = Number(lpn)
  if (!(base > 0)) return 0
  const m = markupPct != null ? Number(markupPct) : NaN
  if (Number.isFinite(m) && m >= 0) {
    return redondearCentenaGs(base * (1 + m / 100))
  }
  const f = factorFallback != null ? Number(factorFallback) : NaN
  if (Number.isFinite(f) && f > 0) {
    return redondearCentenaGs(base * f)
  }
  return redondearCentenaGs(base)
}

function talleKey(codigo: string): string {
  return String(codigo ?? '').trim().toUpperCase()
}

function splitIntEqual(total: number, n: number): number[] {
  if (n <= 0) return []
  const t = Math.max(0, Math.floor(total))
  const base = Math.floor(t / n)
  let rem = t - base * n
  const out = Array.from({ length: n }, () => base)
  for (let i = 0; i < rem; i++) out[i] += 1
  return out
}

function pgClient() {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()
  if (!url) return null
  return new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
}

/** Índice am_talle + LPN por talle (paridad precio×talle RIMEC). */
export async function loadPpd638Enrich(lineas638: string[]): Promise<Ppd638Enrich> {
  const amTalles: PpdAmTalleIndex = new Map()
  const lpnPorTalle: PpdLpnPorTalleIndex = new Map()
  if (lineas638.length === 0) return { amTalles, lpnPorTalle }
  const client = pgClient()
  if (!client) return { amTalles, lpnPorTalle }
  try {
    await client.connect()
    const { rows } = await client.query<PpdTalleRow>(
      `
      SELECT
        TRIM(ppd.linea::text) AS linea,
        TRIM(COALESCE(ppd.referencia::text, '')) AS referencia,
        TRIM(COALESCE(ppd.color_code::text, '')) AS color_code,
        TRIM(ppd.am_talle::text) AS am_talle,
        MAX(ppd.precio_lpn) AS precio_lpn
      FROM pedido_proveedor_detalle ppd
      WHERE ppd.am_talle IS NOT NULL
        AND TRIM(ppd.am_talle::text) <> ''
        AND TRIM(ppd.linea::text) = ANY($1::text[])
      GROUP BY 1, 2, 3, 4
      `,
      [lineas638],
    )
    for (const r of rows) {
      if (!esTalle638Canonico(r.am_talle)) continue
      const talle = String(r.am_talle).trim()
      const keys = [
        `${r.linea}|${r.referencia}|${r.color_code}`,
        `${r.linea}|${r.referencia}|`,
      ]
      for (const k of keys) {
        const arr = amTalles.get(k) ?? []
        if (!arr.includes(talle)) arr.push(talle)
        amTalles.set(k, arr)
      }
      const lpn = Number(r.precio_lpn)
      if (lpn > 0) {
        for (const k of keys) {
          lpnPorTalle.set(`${k}|${talleKey(talle)}`, lpn)
        }
      }
    }
    for (const [k, arr] of Array.from(amTalles.entries())) {
      amTalles.set(
        k,
        [...arr].sort((a, b) => sortTalle638Key(a) - sortTalle638Key(b)),
      )
    }
  } catch (e) {
    console.error('[enrich-grada-638]', e instanceof Error ? e.message : e)
  } finally {
    await client.end().catch(() => {})
  }
  return { amTalles, lpnPorTalle }
}

/** @deprecated usar loadPpd638Enrich — mantiene API am_talle[] */
export async function loadPpdAmTalleIndex(
  lineas638: string[],
): Promise<Map<string, string[]>> {
  const { amTalles } = await loadPpd638Enrich(lineas638)
  return amTalles
}

export function resolveLpnPpdForTalle(
  lpnIndex: PpdLpnPorTalleIndex,
  linea: string,
  ref: string,
  colorCode: string | null | undefined,
  talleCodigo: string,
): number | null {
  const L = String(linea).trim()
  const R = String(ref).trim()
  const C = String(colorCode ?? '').trim()
  const T = talleKey(talleCodigo)
  const hit =
    lpnIndex.get(`${L}|${R}|${C}|${T}`) ??
    lpnIndex.get(`${L}|${R}||${T}`) ??
    null
  return hit != null && hit > 0 ? hit : null
}

/**
 * Reescribe precio_web por talle desde PPD LPN (+ markup).
 * Paridad rimec: buckets distintos cuando LPN difiere.
 */
export function aplicarPreciosPpdATallas638(
  tallas: TallaCatalogo[],
  lpnIndex: PpdLpnPorTalleIndex,
  linea: string,
  ref: string,
  colorCode: string | null | undefined,
  markupPct: number | null | undefined,
): TallaCatalogo[] {
  let factorInferido: number | null = null
  for (const t of tallas) {
    const lpn = resolveLpnPpdForTalle(lpnIndex, linea, ref, colorCode, t.codigo)
    const web = Number(t.precio_web)
    if (lpn && web > 0) {
      factorInferido = web / lpn
      break
    }
  }

  return tallas.map((t) => {
    const lpn = resolveLpnPpdForTalle(lpnIndex, linea, ref, colorCode, t.codigo)
    if (lpn == null) return t
    const web = lpnAPrecioWeb638(lpn, markupPct, factorInferido)
    if (!(web > 0)) return t
    return { ...t, precio_web: web }
  })
}

function lookupAmTalles(
  index: Map<string, string[]>,
  linea: string,
  ref: string,
  colorCode: string | null | undefined,
): string[] {
  const c = String(colorCode ?? '').trim()
  return (
    index.get(`${linea}|${ref}|${c}`) ??
    index.get(`${linea}|${ref}|`) ??
    []
  )
}

/**
 * Reemplaza chips 34–39 por am_talle PPD; reparte stock ALM (Σ = total).
 * Conserva combinacion_id del pool ALM para el carrito (caja abierta).
 * Precio por talle: aplicar después `aplicarPreciosPpdATallas638`.
 */
export function remapTallas638DesdePpd(
  tallasAlm: TallaCatalogo[],
  amTalles: string[],
): TallaCatalogo[] {
  const conStock = tallasAlm.filter((t) => t.stock > 0)
  if (!conStock.length) return []
  const etiquetasAlm = conStock.map((t) => String(t.codigo))
  const contaminado = pareceCurvaCalzado654(etiquetasAlm)

  if (!amTalles.length) {
    if (contaminado) return []
    return [...conStock].sort(
      (a, b) => sortTalle638Key(String(a.codigo)) - sortTalle638Key(String(b.codigo)),
    )
  }
  if (!contaminado) {
    return [...conStock].sort(
      (a, b) => sortTalle638Key(String(a.codigo)) - sortTalle638Key(String(b.codigo)),
    )
  }
  const total = conStock.reduce((s, t) => s + (Number(t.stock) || 0), 0)
  const parts = splitIntEqual(total, amTalles.length)
  return amTalles
    .map((talle, i) => {
      const src = conStock[i % conStock.length]!
      return {
        combinacion_id: src.combinacion_id,
        codigo: talle,
        orden: sortTalle638Key(talle),
        stock: parts[i] ?? 0,
        precio_web: src.precio_web ?? null,
      }
    })
    .filter((t) => t.stock > 0)
}

export function resolveAmTallesForProducto(
  index: Map<string, string[]>,
  linea: string,
  ref: string,
  colorCode: string | null | undefined,
): string[] {
  return lookupAmTalles(index, String(linea).trim(), String(ref).trim(), colorCode)
}

type PeGradaRow = {
  linea: string
  referencia: string
  grada: string
}

/**
 * DPE/PE PRENDAS (tipo0) — ACTVITTA 40000… · grada P(1)P… (no am_talle PPD).
 * Clave linea|ref| → talles canónicos.
 */
export async function loadPePrendasAmTalleIndex(
  lineas?: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const client = pgClient()
  if (!client) return out
  try {
    await client.connect()
    const { rows } = await client.query<PeGradaRow>(
      lineas?.length
        ? `
      SELECT DISTINCT
        TRIM(linea_codigo::text) AS linea,
        TRIM(referencia_codigo::text) AS referencia,
        TRIM(grada::text) AS grada
      FROM v_stock_pe_rimec
      WHERE sdrm_tipo0 ILIKE '%PRENDA%'
        AND grada IS NOT NULL AND TRIM(grada::text) <> ''
        AND TRIM(linea_codigo::text) = ANY($1::text[])
      `
        : `
      SELECT DISTINCT
        TRIM(linea_codigo::text) AS linea,
        TRIM(referencia_codigo::text) AS referencia,
        TRIM(grada::text) AS grada
      FROM v_stock_pe_rimec
      WHERE sdrm_tipo0 ILIKE '%PRENDA%'
        AND grada IS NOT NULL AND TRIM(grada::text) <> ''
      `,
      lineas?.length ? [lineas] : [],
    )
    for (const r of rows) {
      const talle = parseGradaAbierta638(r.grada)
      if (!esTalle638Canonico(talle)) continue
      const k = `${r.linea}|${r.referencia}|`
      const arr = out.get(k) ?? []
      if (!arr.includes(talle)) arr.push(talle)
      out.set(k, arr)
    }
    for (const [k, arr] of Array.from(out.entries())) {
      out.set(
        k,
        [...arr].sort((a, b) => sortTalle638Key(a) - sortTalle638Key(b)),
      )
    }
  } catch (e) {
    console.error('[enrich-grada-pe-prendas]', e instanceof Error ? e.message : e)
  } finally {
    await client.end().catch(() => {})
  }
  return out
}

/** ¿Línea·ref es PRENDAS en índice PE? */
export function esPrendasPe(
  index: Map<string, string[]>,
  linea: string,
  ref: string,
): boolean {
  return resolveAmTallesForProducto(index, linea, ref, null).length > 0
}
