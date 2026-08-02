/**
 * Catálogo Bazzar — grada ropa caja abierta:
 * - 638 Kyly → PPD am_talle
 * - 654 PRENDAS (ACTVITTA ACT ROPAS) → PE v_stock_pe_rimec.grada (PPD am_talle suele vacío)
 * Prohibido pintar talla_codigo ALM 34–39 como talle ropa.
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
}

export type PpdTalleRow = {
  linea: string
  referencia: string
  color_code: string
  am_talle: string
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

function pgClient(): pg.Client | null {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()
  if (!url) return null
  return new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
}

/** Índice linea|ref|color → am_talle[] ordenados */
export async function loadPpdAmTalleIndex(
  lineas638: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (lineas638.length === 0) return out
  const client = pgClient()
  if (!client) return out
  try {
    await client.connect()
    const { rows } = await client.query<PpdTalleRow>(
      `
      SELECT DISTINCT
        TRIM(ppd.linea::text) AS linea,
        TRIM(COALESCE(ppd.referencia::text, '')) AS referencia,
        TRIM(COALESCE(ppd.color_code::text, '')) AS color_code,
        TRIM(ppd.am_talle::text) AS am_talle
      FROM pedido_proveedor_detalle ppd
      WHERE ppd.am_talle IS NOT NULL
        AND TRIM(ppd.am_talle::text) <> ''
        AND TRIM(ppd.linea::text) = ANY($1::text[])
      `,
      [lineas638],
    )
    for (const r of rows) {
      if (!esTalle638Canonico(r.am_talle)) continue
      const keys = [
        `${r.linea}|${r.referencia}|${r.color_code}`,
        `${r.linea}|${r.referencia}|`,
      ]
      for (const k of keys) {
        const arr = out.get(k) ?? []
        if (!arr.includes(r.am_talle)) arr.push(r.am_talle)
        out.set(k, arr)
      }
    }
    for (const [k, arr] of Array.from(out.entries())) {
      out.set(
        k,
        [...arr].sort((a, b) => sortTalle638Key(a) - sortTalle638Key(b)),
      )
    }
  } catch (e) {
    console.error('[enrich-grada-638]', e instanceof Error ? e.message : e)
  } finally {
    await client.end().catch(() => {})
  }
  return out
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
    // Sin PPD: no pintar 34–39 como talle ropa
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
    .map((talle, i) => ({
      combinacion_id: conStock[i % conStock.length]!.combinacion_id,
      codigo: talle,
      orden: sortTalle638Key(talle),
      stock: parts[i] ?? 0,
    }))
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
