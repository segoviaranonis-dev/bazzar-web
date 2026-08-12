/**
 * Mega-menú por género — Marcas vertical · Estilos · portada por género.
 * BR SPORT portada solo Caballeros. Orden marcas por género (Director).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'
import { isEstiloPlaceholder } from '@/lib/catalogo/enrich-estilo'
import {
  imagenPortadaCandidates,
  objectPositionPortadaMega,
} from '@/lib/imagen-portada'
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

/** Orden preferente de marcas por género (Director 2026-08-12). */
const MARCA_PREF: Record<number, string[]> = {
  [GENERO_NAV.damas.id]: ['BEIRA RIO', 'VIZZANO', 'MODARE', 'MOLECA'],
  [GENERO_NAV.caballeros.id]: ['ACTVITTA', 'BR SPORT'],
  [GENERO_NAV.ninas.id]: ['MOLEKINHA', 'MILON', 'KYLY'],
  [GENERO_NAV.ninos.id]: ['MOLEKINHO', 'KYLY', 'MILON'],
}

/** Portadas destacadas (carousel) — BR SPORT solo Caballeros. */
const PORTADA_MARCAS: Record<number, string[]> = {
  [GENERO_NAV.caballeros.id]: ['BR SPORT'],
  [GENERO_NAV.damas.id]: ['VIZZANO'],
  [GENERO_NAV.ninas.id]: ['MOLEKINHA', 'MILON'],
  [GENERO_NAV.ninos.id]: ['MOLEKINHO', 'KYLY'],
}

function normMarca(m: string): string {
  return m.trim().toUpperCase().replace(/\s+/g, ' ')
}

function sortMarcas(generoId: number, marcas: string[]): string[] {
  const pref = MARCA_PREF[generoId] ?? []
  const byNorm = new Map(marcas.map((m) => [normMarca(m), m]))
  const head = pref
    .map((p) => byNorm.get(p))
    .filter((m): m is string => !!m)
  const headSet = new Set(head.map(normMarca))
  const rest = marcas
    .filter((m) => !headSet.has(normMarca(m)))
    .sort((a, b) => a.localeCompare(b, 'es'))
  return [...head, ...rest]
}

function buildPortada(generoId: number): GeneroMegaFacet['portada'] {
  const marcas = PORTADA_MARCAS[generoId] ?? ['VIZZANO']
  const primary = marcas[0]
  const candidates = marcas.flatMap((m) => imagenPortadaCandidates(m, 'lg'))
  return {
    marcas,
    href: hrefGenero({ genero_id: generoId, marca: primary }),
    candidates,
    objectPosition: objectPositionPortadaMega(primary),
    ctaLabel: 'Comprar todo',
  }
}

/** Estilos desde LR (rápido) — sin PE/pg (evita timeout Damas). */
async function estilosDesdeLr(
  rows: StockWebItem[],
): Promise<Map<string, { id: number | null; nombre: string }>> {
  const out = new Map<string, { id: number | null; nombre: string }>()
  const lineaIds = Array.from(
    new Set(rows.map((r) => Number(r.linea_id)).filter((id) => id > 0)),
  )
  if (lineaIds.length === 0) return out

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('linea_referencia')
    .select(
      'linea_id, referencia_id, grupo_estilo_id, descp_grupo_estilo, grupo_estilo_v2(descp_grupo_estilo)',
    )
    .in('linea_id', lineaIds)

  if (error) {
    console.error('[genero-mega LR]', error.message)
    return out
  }

  for (const e of data ?? []) {
    const ge = e.grupo_estilo_v2 as { descp_grupo_estilo?: string } | null
    const nom = String(ge?.descp_grupo_estilo ?? e.descp_grupo_estilo ?? '').trim()
    if (!nom || isEstiloPlaceholder(nom)) continue
    const id =
      e.grupo_estilo_id != null && Number(e.grupo_estilo_id) > 0
        ? Number(e.grupo_estilo_id)
        : null
    out.set(`${Number(e.linea_id)}|${Number(e.referencia_id)}`, { id, nombre: nom })
  }
  return out
}

export async function loadGeneroMegaFacets(generoId: number): Promise<GeneroMegaFacet> {
  const gid = Number(generoId)
  const label = LABEL_BY_ID[gid] ?? `Género ${gid}`
  const portada = buildPortada(gid)

  const empty: GeneroMegaFacet = {
    genero_id: gid,
    genero_label: label,
    marcas: [],
    estilos: [],
    estilosPorMarca: {},
    portada,
  }

  if (!Number.isFinite(gid) || gid <= 0) return empty

  const supabase = createAdminClient()
  const { data, error } = await soloVendibleCatalogo(
    supabase.from('v_stock_web').select(SELECT).eq('genero_id', gid),
  ).limit(8000)

  if (error) {
    console.error('[genero-mega]', error.message)
  }

  const rows = ([...(data ?? [])] as unknown as StockWebItem[]).filter(
    (r) => Number(r.stock_web) > 0,
  )

  const marcasRaw = Array.from(
    new Set(rows.map((r) => String(r.marca ?? '').trim()).filter(Boolean)),
  )
  const marcas = sortMarcas(gid, marcasRaw)

  const lrMap = await estilosDesdeLr(rows)

  const estilosPorMarca: Record<string, string[]> = {}
  const estiloAll = new Set<string>()

  for (const r of rows) {
    const marca = String(r.marca ?? '').trim()
    if (!marca) continue
    const fromVista = String(r.descp_grupo_estilo ?? '').trim()
    const fromLr = lrMap.get(`${Number(r.linea_id)}|${Number(r.referencia_id)}`)?.nombre
    const nom =
      fromLr && !isEstiloPlaceholder(fromLr)
        ? fromLr
        : fromVista && !isEstiloPlaceholder(fromVista)
          ? fromVista
          : ''
    if (!nom) continue
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
      ...portada,
      href: hrefGenero({ genero_id: gid, marca: portada.marcas[0] }),
    },
  }
}
