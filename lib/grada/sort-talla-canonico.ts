/**
 * Orden canónico de talles — paridad Estadísticas de Stock (2.5.1.7).
 * 654: etiqueta numérica (35…43).
 * 638: 1·2·3 → P·M·G·GG → 4·6·8 → 10… (Director).
 */

const ORDEN_LETRA: Record<string, number> = {
  PP: 1,
  P: 2,
  M: 3,
  G: 4,
  GG: 5,
  XG: 6,
  XXG: 7,
  RN: 8,
  U: 9,
  UNICO: 9,
}

const RE_NUM = /^(\d+)\((\d+)\)(\d+)$/
const RE_LETRA = /^([A-Za-z]+)\((\d+)\)([A-Za-z]+)$/i

export function parseEtiquetaTalle638(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text || text === '—') return '—'
  const mNum = text.match(RE_NUM)
  if (mNum) return mNum[1]
  const mLet = text.match(RE_LETRA)
  if (mLet) return mLet[1].toUpperCase()
  if (text.includes('/')) return text
  const lead = text.match(/^(\d+)/)
  if (lead) return lead[1]
  return text.toUpperCase()
}

/** Clave orden 638 — mismo contrato que auditoria-local/grada638.ts */
export function sortTalle638Key(talle: string): number {
  const u = String(talle).trim().toUpperCase()
  if (!u) return 9999
  if (u.includes('/')) return 400 + (u.charCodeAt(0) || 0)
  if (ORDEN_LETRA[u] != null) return 200 + ORDEN_LETRA[u]
  const n = parseInt(u.replace(/[^\d]/g, ''), 10)
  if (Number.isFinite(n) && n > 0) {
    if (n >= 1 && n <= 3) return 100 + n
    return 300 + n
  }
  return 9000 + (u.charCodeAt(0) || 0)
}

/** 654 calzado — serial por etiqueta numérica (no orden_visual BD). */
export function sortTalla654Key(talle: string): number {
  const n = Number.parseFloat(String(talle).replace(',', '.'))
  if (Number.isFinite(n)) return n
  return 9000 + (String(talle).charCodeAt(0) || 0)
}

export function sortTallaCatalogo(
  a: string,
  b: string,
  proveedorId?: number | null,
): number {
  if (Number(proveedorId) === 638) {
    return (
      sortTalle638Key(parseEtiquetaTalle638(a)) - sortTalle638Key(parseEtiquetaTalle638(b))
    )
  }
  return sortTalla654Key(a) - sortTalla654Key(b)
}
