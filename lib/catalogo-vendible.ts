/**
 * Filtro unificado catálogo Bazzar Web — solo filas vendibles.
 * Caja abierta: cada fila = combinacion_id (talla); el cliente elige talla suelta.
 */
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function soloVendibleCatalogo<Q extends PostgrestFilterBuilder<any, any, any, any, any>>(q: Q): Q {
  return q
    .gt('stock_web', 0)
    .gt('precio_web', 0)
    .eq('stock_sano_estado', 'SANO') as Q
}
