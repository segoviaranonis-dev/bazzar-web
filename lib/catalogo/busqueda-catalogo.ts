/**
 * Búsqueda catálogo — un solo contrato para header y sidebar.
 * Submit → `/catalogo?q=` · autocomplete → `/api/search`
 */

export const CATALOGO_SEARCH_PLACEHOLDER = 'L-R-M-C · marca · estilo…'

export const CATALOGO_SEARCH_ARIA = 'Buscar en catálogo'

export type CatalogoSearchHit = {
  tipo: string
  label: string
  href: string
}
