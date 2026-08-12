/**
 * Mega-menú Rebajas — 3 paneles (Género · Marca · Estilo) + portada BR Sport.
 * Universo = stock vivo con tipo liquidacion (filtro-tipo-canonico).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'
import {
  enrichEstiloDesdeLineaReferencia,
  isEstiloPlaceholder,
} from '@/lib/catalogo/enrich-estilo'
import { esLiquidacionRow } from '@/lib/filtros/filtro-tipo-canonico'
import { imagenPortadaCandidates } from '@/lib/imagen-portada'
import { hrefRebajas } from '@/lib/nav/header-nav'
import type { RebajasMegaFacet } from '@/lib/nav/rebajas-mega-types'
import type { StockWebItem } from '@/types/bazzar'

export type { RebajasMegaFacet }

const SELECT = [
  'marca',
  'genero_id',
  'descp_genero',
  'descp_grupo_estilo',
  'grupo_estilo_id',
  'linea_id',
  'referencia_id',
  'linea_codigo',
  'referencia_codigo',
  'stock_sano_caso',
  'stock_web',
].join(',')

export { hrefRebajas }

export async function loadRebajasMegaFacets(opts?: {
  genero_id?: number | null
}): Promise<RebajasMegaFacet> {
  const supabase = createAdminClient()
  const { data, error } = await soloVendibleCatalogo(
    supabase.from('v_stock_web').select(SELECT),
  ).limit(8000)

  if (error) {
    console.error('[rebajas-mega]', error.message)
  }

  let rows = ([...(data ?? [])] as unknown as StockWebItem[]).filter(
    (r) => Number(r.stock_web) > 0 && esLiquidacionRow(r),
  )
  rows = await enrichEstiloDesdeLineaReferencia(rows)

  const generoMap = new Map<number, string>()
  for (const r of rows) {
    const id = Number(r.genero_id)
    const nom = String(r.descp_genero ?? '').trim()
    if (Number.isFinite(id) && id > 0 && nom) generoMap.set(id, nom)
  }
  const generos = [...generoMap.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const gid = opts?.genero_id != null && opts.genero_id > 0 ? opts.genero_id : null
  const scoped = gid ? rows.filter((r) => Number(r.genero_id) === gid) : rows

  const marcas = Array.from(
    new Set(scoped.map((r) => String(r.marca ?? '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'es'))

  const estiloSet = new Set<string>()
  for (const r of scoped) {
    const nom = String(r.descp_grupo_estilo ?? '').trim()
    if (!nom || isEstiloPlaceholder(nom)) continue
    estiloSet.add(nom)
  }
  const estilos = [...estiloSet]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((nombre) => ({ nombre }))

  return {
    generos,
    marcas,
    estilos,
    portada: {
      marca: 'BR SPORT',
      href: hrefRebajas({ marca: 'BR SPORT', genero_id: gid }),
      candidates: imagenPortadaCandidates('BR SPORT', 'lg'),
      objectPosition: 'center center',
      ctaLabel: 'Comprar todo',
    },
  }
}
