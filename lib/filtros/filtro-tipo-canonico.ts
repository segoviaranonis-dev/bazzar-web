/**
 * Filtro canónico «Tipo» — paridad RIMEC Web / Report (hermanos siameses).
 * Bazzar: caja abierta · señales desde v_stock_web (stock_sano_caso · estilo).
 *
 * Prioridad: liquidacion → promo → carteras | normal
 */

export type TipoGrupoId = 'normal' | 'carteras' | 'promo' | 'liquidacion'

export const TIPO_GRUPO_OPCIONES: ReadonlyArray<{ id: TipoGrupoId; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'carteras', label: 'Carteras' },
  { id: 'promo', label: 'Promo' },
  { id: 'liquidacion', label: 'Liquidación' },
] as const

export type RamoTipoBazzar = 'CALZADO' | 'CONFECCIONES' | ''

export type RowTipoSignals = {
  stock_sano_caso?: string | null
  descp_caso?: string | null
  descp_grupo_estilo?: string | null
  cadena_comercial?: string | null
  es_promo?: boolean | number | string | null
  es_liquidacion?: boolean | number | string | null
}

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toUpperCase()
}

export function esLiquidacionRow(row: RowTipoSignals): boolean {
  if (row.es_liquidacion === true || row.es_liquidacion === 1) return true
  if (String(row.es_liquidacion ?? '').trim().toLowerCase() === 'true') return true
  const c = norm(row.cadena_comercial)
  if (c === 'LIQUIDACION' || c.includes('LIQUID')) return true
  const caso = norm(row.stock_sano_caso ?? row.descp_caso)
  return caso.includes('LIQUID')
}

export function esPromoRow(row: RowTipoSignals): boolean {
  if (row.es_promo === true || row.es_promo === 1) return true
  if (String(row.es_promo ?? '').trim().toLowerCase() === 'true') return true
  if (norm(row.cadena_comercial) === 'PROMOCIONAL') return true
  const caso = norm(row.stock_sano_caso ?? row.descp_caso)
  return caso.includes('PROMO')
}

export function esCarterasRow(row: RowTipoSignals): boolean {
  const e = norm(row.descp_grupo_estilo)
  const caso = norm(row.stock_sano_caso ?? row.descp_caso)
  return e.includes('CARTERA') || caso.includes('CARTERA')
}

export function resolveTipoGruposForRow(row: RowTipoSignals): TipoGrupoId[] {
  if (esLiquidacionRow(row)) return ['liquidacion']
  if (esPromoRow(row)) return ['promo']
  if (esCarterasRow(row)) return ['carteras']
  return ['normal']
}

export function rowMatchesTipoGrupos(
  row: RowTipoSignals,
  selected: readonly TipoGrupoId[],
): boolean {
  if (!selected.length) return true
  const grupos = resolveTipoGruposForRow(row)
  return selected.some((g) => grupos.includes(g))
}

export function toggleTipoGrupo(list: TipoGrupoId[], id: TipoGrupoId): TipoGrupoId[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

/** Mario Bros · Calzado → sin chip Carteras en Tipo (módulo aparte). */
export function tipoGrupoOpcionesVisibles(ramo_tipo?: string): typeof TIPO_GRUPO_OPCIONES {
  const ramo = String(ramo_tipo ?? '').trim().toUpperCase()
  if (ramo === 'CALZADO') return TIPO_GRUPO_OPCIONES.filter((o) => o.id !== 'carteras')
  if (ramo === 'CONFECCIONES') {
    return TIPO_GRUPO_OPCIONES.filter((o) => o.id === 'normal' || o.id === 'promo')
  }
  return TIPO_GRUPO_OPCIONES
}

export function sanitizeTipoGruposParaRamo(
  tipo_grupos: readonly TipoGrupoId[] | undefined,
  ramo_tipo?: string,
): TipoGrupoId[] {
  const visibles = new Set(tipoGrupoOpcionesVisibles(ramo_tipo).map((o) => o.id))
  return [...(tipo_grupos ?? [])].filter((g) => visibles.has(g))
}

/** Calzado por defecto excluye carteras (salvo chip Tipo=Carteras). */
export function calzadoExcluyeCarterasPorDefecto(filters: {
  ramo_tipo?: string
  tipo_grupos?: readonly TipoGrupoId[]
}): boolean {
  if (String(filters.ramo_tipo ?? '').trim().toUpperCase() !== 'CALZADO') return false
  if ((filters.tipo_grupos ?? []).includes('carteras')) return false
  return true
}

export function parseTipoGruposParam(raw: string | undefined | null): TipoGrupoId[] {
  if (!raw) return []
  const allowed = new Set<string>(TIPO_GRUPO_OPCIONES.map((o) => o.id))
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is TipoGrupoId => allowed.has(s))
}
