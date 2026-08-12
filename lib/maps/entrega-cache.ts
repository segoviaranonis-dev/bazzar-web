/**
 * Memoria local del navegador — reconocer usuario + último punto Delivery.
 * Vincula cédula (si hubo) con punto de entrega en este dispositivo.
 */
import type { PuntoEntrega } from './types'

const KEY = 'bazzar_entrega_v1'
const KEY_GEO = 'bazzar_geo_ok_v1'

export type EntregaCache = {
  punto: PuntoEntrega | null
  cedula?: string | null
  nombre?: string | null
  telefono?: string | null
  direccion_texto?: string | null
  geo_permiso?: 'granted' | 'denied' | 'prompt' | null
  updated_at: string
}

function safeParse(raw: string | null): EntregaCache | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as EntregaCache
  } catch {
    return null
  }
}

export function leerEntregaCache(): EntregaCache | null {
  if (typeof window === 'undefined') return null
  return safeParse(localStorage.getItem(KEY))
}

export function guardarEntregaCache(partial: Partial<EntregaCache>): EntregaCache {
  const prev = leerEntregaCache() ?? {
    punto: null,
    updated_at: new Date().toISOString(),
  }
  const next: EntregaCache = {
    ...prev,
    ...partial,
    updated_at: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function guardarPuntoEntrega(punto: PuntoEntrega, meta?: { cedula?: string }) {
  return guardarEntregaCache({
    punto,
    direccion_texto: punto.direccion,
    cedula: meta?.cedula ?? leerEntregaCache()?.cedula ?? null,
  })
}

export function marcarGeoPermiso(estado: 'granted' | 'denied' | 'prompt') {
  try {
    localStorage.setItem(KEY_GEO, estado)
  } catch {}
  guardarEntregaCache({ geo_permiso: estado })
}

export function leerGeoPermiso(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY_GEO) ?? leerEntregaCache()?.geo_permiso ?? null
}
