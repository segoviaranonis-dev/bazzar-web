/**
 * Nav header Bazzar — labels retail → params catálogo canónicos.
 * Géneros = mismo filtro GÉNERO · MULTI del catálogo (no Calzado/Confecciones).
 * (sin imports server/pg — usable en client)
 */
import type { TipoGrupoId } from '@/lib/filtros/filtro-tipo-canonico'

/** Links mega Rebajas → catálogo liquidación. */
export function hrefRebajas(opts: {
  genero_id?: number | null
  marca?: string | null
  grupo_estilo?: string | null
}): string {
  const p = new URLSearchParams()
  p.set('tipo_grupos', 'liquidacion')
  if (opts.genero_id != null && opts.genero_id > 0) {
    p.set('genero_id', String(opts.genero_id))
  }
  if (opts.marca?.trim()) p.set('marca', opts.marca.trim())
  if (opts.grupo_estilo?.trim()) p.set('grupo_estilo', opts.grupo_estilo.trim())
  return `/catalogo?${p.toString()}`
}

/** Links mega por género (Caballeros, Damas, …) → catálogo. */
export function hrefGenero(opts: {
  genero_id: number
  marca?: string | null
  grupo_estilo?: string | null
}): string {
  const p = new URLSearchParams()
  p.set('genero_id', String(opts.genero_id))
  if (opts.marca?.trim()) p.set('marca', opts.marca.trim())
  if (opts.grupo_estilo?.trim()) p.set('grupo_estilo', opts.grupo_estilo.trim())
  return `/catalogo?${p.toString()}`
}

export type HeaderNavItem = {
  id: string
  /** Texto visible (estilo Boss) */
  label: string
  href: string
  match: {
    pathPrefix?: string
    tipo_grupos?: TipoGrupoId
    /** Filtro GÉNERO · MULTI */
    genero_id?: number
    /** Catálogo sin filtros de tipo/género top */
    catalogoTodos?: boolean
    inicio?: boolean
  }
}

/**
 * IDs canónicos género (v_stock_web / GÉNERO · MULTI).
 * 1 DAMAS · 2 CABALLEROS · 3 NIÑOS · 4 NIÑAS
 */
export const GENERO_NAV = {
  damas: { id: 1, label: 'Damas' },
  caballeros: { id: 2, label: 'Caballeros' },
  ninos: { id: 3, label: 'Niños' },
  ninas: { id: 4, label: 'Niñas' },
} as const

/** Orden UI filtro: Caballeros · Damas · Niñas · Niños (ex Calzado/Confecciones) */
export const HEADER_NAV_ITEMS: readonly HeaderNavItem[] = [
  {
    id: 'rebajas',
    label: 'Rebajas',
    href: '/catalogo?tipo_grupos=liquidacion',
    match: { pathPrefix: '/catalogo', tipo_grupos: 'liquidacion' },
  },
  {
    id: 'caballeros',
    label: GENERO_NAV.caballeros.label,
    href: `/catalogo?genero_id=${GENERO_NAV.caballeros.id}`,
    match: { pathPrefix: '/catalogo', genero_id: GENERO_NAV.caballeros.id },
  },
  {
    id: 'damas',
    label: GENERO_NAV.damas.label,
    href: `/catalogo?genero_id=${GENERO_NAV.damas.id}`,
    match: { pathPrefix: '/catalogo', genero_id: GENERO_NAV.damas.id },
  },
  {
    id: 'ninas',
    label: GENERO_NAV.ninas.label,
    href: `/catalogo?genero_id=${GENERO_NAV.ninas.id}`,
    match: { pathPrefix: '/catalogo', genero_id: GENERO_NAV.ninas.id },
  },
  {
    id: 'ninos',
    label: GENERO_NAV.ninos.label,
    href: `/catalogo?genero_id=${GENERO_NAV.ninos.id}`,
    match: { pathPrefix: '/catalogo', genero_id: GENERO_NAV.ninos.id },
  },
  {
    id: 'promo',
    label: 'Promo',
    href: '/catalogo?tipo_grupos=promo',
    match: { pathPrefix: '/catalogo', tipo_grupos: 'promo' },
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    href: '/catalogo',
    match: { pathPrefix: '/catalogo', catalogoTodos: true },
  },
] as const

export function isHeaderNavActive(
  item: HeaderNavItem,
  pathname: string | null,
  searchParams: URLSearchParams,
): boolean {
  const path = pathname ?? ''
  if (item.match.inicio) {
    return path === '/' || path.startsWith('/inicio')
  }
  if (item.match.pathPrefix && !path.startsWith(item.match.pathPrefix)) {
    return false
  }

  const tipos = (searchParams.get('tipo_grupos') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const generoId = Number(searchParams.get('genero_id'))

  if (item.match.tipo_grupos) {
    return tipos.includes(item.match.tipo_grupos)
  }

  if (item.match.genero_id != null) {
    return (
      Number.isFinite(generoId) &&
      generoId === item.match.genero_id &&
      !tipos.includes('liquidacion') &&
      !tipos.includes('promo')
    )
  }

  if (item.match.catalogoTodos || item.id === 'catalogo') {
    return (
      path.startsWith('/catalogo') &&
      tipos.length === 0 &&
      !(Number.isFinite(generoId) && generoId > 0)
    )
  }

  return false
}
