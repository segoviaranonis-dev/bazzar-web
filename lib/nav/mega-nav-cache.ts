/**
 * Caché en memoria del mega-menú header.
 * Prefetch en idle → hover Caballeros/Damas no espera 1–2s de API.
 */
import type { GeneroMegaFacet } from '@/lib/nav/genero-mega-types'
import type { RebajasMegaFacet } from '@/lib/nav/rebajas-mega-types'
import { GENERO_NAV } from '@/lib/nav/header-nav'

type GeneroPayload = GeneroMegaFacet & { ok?: boolean }
type RebajasPayload = RebajasMegaFacet & { ok?: boolean }

const generoCache = new Map<number, GeneroPayload>()
const generoInflight = new Map<number, Promise<GeneroPayload | null>>()
let rebajasCache: RebajasPayload | null = null
let rebajasInflight: Promise<RebajasPayload | null> | null = null

export function peekGeneroMega(generoId: number): GeneroPayload | null {
  return generoCache.get(generoId) ?? null
}

export function peekRebajasMega(): RebajasPayload | null {
  return rebajasCache
}

export async function fetchGeneroMega(
  generoId: number,
): Promise<GeneroPayload | null> {
  const hit = generoCache.get(generoId)
  if (hit) return hit
  const pending = generoInflight.get(generoId)
  if (pending) return pending

  const p = (async () => {
    try {
      const res = await fetch(`/api/nav/genero?genero_id=${generoId}`, {
        cache: 'force-cache',
      })
      const json = (await res.json()) as GeneroPayload
      if (!res.ok || json?.ok === false) return null
      generoCache.set(generoId, json)
      return json
    } catch {
      return null
    } finally {
      generoInflight.delete(generoId)
    }
  })()
  generoInflight.set(generoId, p)
  return p
}

export async function fetchRebajasMega(
  generoId?: number | null,
): Promise<RebajasPayload | null> {
  // Facetas base (sin género) — las más usadas al abrir Rebajas
  if (generoId == null || generoId <= 0) {
    if (rebajasCache) return rebajasCache
    if (rebajasInflight) return rebajasInflight
    rebajasInflight = (async () => {
      try {
        const res = await fetch('/api/nav/rebajas', { cache: 'force-cache' })
        const json = (await res.json()) as RebajasPayload
        if (!res.ok || json?.ok === false) return null
        rebajasCache = json
        return json
      } catch {
        return null
      } finally {
        rebajasInflight = null
      }
    })()
    return rebajasInflight
  }
  try {
    const res = await fetch(`/api/nav/rebajas?genero_id=${generoId}`, {
      cache: 'force-cache',
    })
    const json = (await res.json()) as RebajasPayload
    if (!res.ok || json?.ok === false) return null
    return json
  } catch {
    return null
  }
}

const GENERO_IDS = [
  GENERO_NAV.damas.id,
  GENERO_NAV.caballeros.id,
  GENERO_NAV.ninas.id,
  GENERO_NAV.ninos.id,
] as const

/** Prefetch inmediato + refuerzo en idle. Idempotente (caché / inflight). */
export function prefetchMegaNavBackground(): void {
  if (typeof window === 'undefined') return
  const run = () => {
    void fetchRebajasMega(null)
    for (const id of GENERO_IDS) void fetchGeneroMega(id)
  }
  // Ya: no esperar hover Caballeros (1–2s).
  run()
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    ric(run, { timeout: 800 })
  }
}
