/**
 * Mega-menú por género — Marcas (vertical) · Estilos · portada BR Sport.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'
import {
  enrichEstiloDesdeLineaReferencia,
  isEstiloPlaceholder,
} from '@/lib/catalogo/enrich-estilo'
import { imagenPortadaCandidates } from '@/lib/imagen-portada'
import { GENERO_NAV, hrefGenero } from '@/lib/nav/header-nav'
import type { GeneroMegaFacet } from '@/lib/nav/genero-mega-types'
import type { StockWebItem } from '@/types/bazzar'

export type { GeneroMegaFacet }

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
  'stock_web',
].join(',')

const LABEL_BY_ID: Record<number, string> = {
  [GENERO_NAV.damas.id]: GENERO_NAV.damas.label,
  [GENERO_NAV.caballeros.id]: GENERO_NAV.caballeros.label,
  [GENERO_NAV.ninos.id]: GENERO_NAV.ninos.label,
  [GENERO_NAV.ninas.id]: GENERO_NAV.ninas.label,
}

/** Preferencia visual: ACTVITTA y BR SPORT arriba. */
function sortMarcas(marcas: string[]): string[] {
  const pref = ['ACTVITTA', 'BR SPORT']
  const rest = marcas
    .filter((m) => !pref.includes(m.toUpperCase().replace(/\s+/g, ' ')))
    .sort((a, b) => a.localeCompare(b, 'es'))
  const head = pref.filter((p) =>
    marcas.some((m) => m.toUpperCase().replace(/\s+/g, ' ') === p),
  )
  const headCanon = head.map(
    (p) => marcas.find((m) => m.toUpperCase().replace(/\s+/g, ' ') === p) ?? p,
  )
  return [...headCanon, ...rest]
}

export async function loadGeneroMegaFacets(generoId: number): Promise<GeneroMegaFacet> {
  const gid = Number(generoId)
  const label = LABEL_BY_ID[gid] ?? `Género ${gid}`

  const empty: GeneroMegaFacet = {
    genero_id: gid,
    genero_label: label,
    marcas: [],
    estilos: [],
    estilosPorMarca: {},
    portada: {
      marca: 'BR SPORT',
      href: hrefGenero({ genero_id: gid, marca: 'BR SPORT' }),
      candidates: imagenPortadaCandidates('BR SPORT', 'lg'),
      objectPosition: 'center center',
      ctaLabel: 'Comprar todo',
    },
  }

  if (!Number.isFinite(gid) || gid <= 0) return empty

  const supabase = createAdminClient()
  const { data, error } = await soloVendibleCatalogo(
    supabase.from('v_stock_web').select(SELECT).eq('genero_id', gid),
  ).limit(8000)

  if (error) {
    console.error('[genero-mega]', error.message)
  }

  let rows = ([...(data ?? [])] as unknown as StockWebItem[]).filter(
    (r) => Number(r.stock_web) > 0,
  )
  rows = await enrichEstiloDesdeLineaReferencia(rows)

  const marcasRaw = Array.from(
    new Set(rows.map((r) => String(r.marca ?? '').trim()).filter(Boolean)),
  )
  const marcas = sortMarcas(marcasRaw)

  const estilosPorMarca: Record<string, string[]> = {}
  const estiloAll = new Set<string>()
  for (const r of rows) {
    const marca = String(r.marca ?? '').trim()
    const nom = String(r.descp_grupo_estilo ?? '').trim()
    if (!marca || !nom || isEstiloPlaceholder(nom)) continue
    estiloAll.add(nom)
    if (!estilosPorMarca[marca]) estilosPorMarca[marca] = []
    if (!estilosPorMarca[marca].includes(nom)) estilosPorMarca[marca].push(nom)
  }
  for (const m of Object.keys(estilosPorMarca)) {
    estilosPorMarca[m].sort((a, b) => a.localeCompare(b, 'es'))
  }

  const estilos = [...estiloAll]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((nombre) => ({ nombre }))

  return {
    ...empty,
    marcas,
    estilos,
    estilosPorMarca,
    portada: {
      ...empty.portada,
      href: hrefGenero({ genero_id: gid, marca: 'BR SPORT' }),
    },
  }
}
