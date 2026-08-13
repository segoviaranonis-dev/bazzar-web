/**
 * Snapshot vendible catálogo Bazzar — TTL 30s en memoria de proceso.
 * Cada click de filtro reutiliza filas + estilo; no re-baja v_stock_web.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'
import { enrichEstiloDesdeLineaReferencia } from '@/lib/catalogo/enrich-estilo'
import type { StockWebItem } from '@/types/bazzar'

const TTL_MS = 30_000

/** Columnas tipadas — select(*) con rol anon hace timeout en PostgREST. */
export const CATALOGO_SELECT = [
  'combinacion_id',
  'marca',
  'linea_id',
  'proveedor_importacion_id',
  'linea_codigo',
  'linea_descripcion',
  'referencia_id',
  'referencia_codigo',
  'referencia_descripcion',
  'material_id',
  'material_code',
  'material_descripcion',
  'color_id',
  'color_code',
  'color_nombre',
  'hex_web',
  'ppd_color_codigo',
  'imagen_url',
  'talla_codigo',
  'talla_orden',
  'stock_web',
  'precio_web',
  'stock_sano_estado',
  'stock_sano_caso',
  'stock_sano_lpn',
  'stock_sano_markup_pct',
  'descp_grupo_estilo',
  'grupo_estilo_id',
  'genero_id',
  'descp_genero',
].join(',')

function cmpCodigoProveedor(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  return String(a ?? '')
    .trim()
    .localeCompare(String(b ?? '').trim(), 'es', { numeric: true, sensitivity: 'base' })
}

function sortRowsLRMC(rows: StockWebItem[]): StockWebItem[] {
  return [...rows].sort((a, b) => {
    let c = cmpCodigoProveedor(a.linea_codigo, b.linea_codigo)
    if (c) return c
    c = cmpCodigoProveedor(a.referencia_codigo, b.referencia_codigo)
    if (c) return c
    c = cmpCodigoProveedor(
      a.material_code ?? a.id_material_f9,
      b.material_code ?? b.id_material_f9,
    )
    if (c) return c
    c = cmpCodigoProveedor(
      a.color_code ?? a.ppd_color_codigo ?? a.id_color_f9,
      b.color_code ?? b.ppd_color_codigo ?? b.id_color_f9,
    )
    if (c) return c
    return (Number(a.talla_orden) || 0) - (Number(b.talla_orden) || 0)
  })
}

type CacheEntry = {
  at: number
  rows: StockWebItem[]
}

let cache: CacheEntry | null = null
let inflight: Promise<StockWebItem[]> | null = null

async function loadFresh(): Promise<StockWebItem[]> {
  const supabase = createAdminClient()
  let query = supabase.from('v_stock_web').select(CATALOGO_SELECT)
  query = soloVendibleCatalogo(query)
  const { data, error } = await query
  if (error) console.error('[catalogo-snapshot]', error.message)
  const raw = sortRowsLRMC((data ?? []) as unknown as StockWebItem[])
  return enrichEstiloDesdeLineaReferencia(raw)
}

export type CatalogoSnapshotResult = {
  rows: StockWebItem[]
  cacheHit: boolean
  ms: number
  rowCount: number
}

/** Universo vendible + estilo enriquecido. TTL 30s · coalesce inflight. */
export async function getCatalogoSnapshot(): Promise<CatalogoSnapshotResult> {
  const t0 = Date.now()
  if (cache && Date.now() - cache.at < TTL_MS) {
    return {
      rows: cache.rows,
      cacheHit: true,
      ms: Date.now() - t0,
      rowCount: cache.rows.length,
    }
  }
  if (!inflight) {
    inflight = loadFresh()
      .then((rows) => {
        cache = { at: Date.now(), rows }
        return rows
      })
      .finally(() => {
        inflight = null
      })
  }
  const rows = await inflight
  return {
    rows,
    cacheHit: false,
    ms: Date.now() - t0,
    rowCount: rows.length,
  }
}

/** Solo tests / smoke. */
export function __resetCatalogoSnapshotForTests(): void {
  cache = null
  inflight = null
}
