/**
 * Paridad mínima RIMEC Web grada abierta 638 (lectura auditoría).
 * Canónico: rimec-web/lib/gradaAbierta638.ts · CONFECCIONES_638_VS_CALZADO_654.md
 *
 * Orden Director cabecera: 1·2·3 → P·M·G·GG → 4·6·8 → 10·12·14·16
 * NUNCA curva caja 654.
 */

const RE_NUM = /^(\d+)\((\d+)\)(\d+)$/
const RE_LETRA = /^([A-Za-z]+)\((\d+)\)([A-Za-z]+)$/i

/** Bloque letras (después de 1·2·3, antes de 4·6·8…) */
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

export function parseGradaAbierta638(raw: string | null | undefined): string {
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

/**
 * Clave de orden cabecera 638:
 * 1·2·3 (100+) → P·M·G·GG (200+) → 4·6·8·10… (300+) → combos 4/6/8 (400+)
 */
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

/**
 * Heurística: etiquetas 34–43 en bloque tipico calzado → dato NO es grada abierta 638.
 * (Import ALM_WEB ficticio mezcló pilar talla 654.)
 */
export function pareceCurvaCalzado654(talles: string[]): boolean {
  if (talles.length === 0) return false
  let hit = 0
  for (const t of talles) {
    const n = Number.parseFloat(String(t).replace(',', '.'))
    if (Number.isFinite(n) && n >= 33 && n <= 45) hit++
  }
  return hit >= Math.max(2, Math.ceil(talles.length * 0.7))
}

/**
 * Talle ropa 638 canónico (am_talle / parse Carlos).
 * Acepta: P·M·G·GG · 1·2·3 · 4·6·8 · 10…20 · combos 4/6/8.
 * Rechaza: curva calzado 33–45.
 */
export function esTalle638Canonico(raw: string | null | undefined): boolean {
  const u = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (!u || u === '—') return false
  if (u.includes('/')) return true
  if (/^(PP|P|M|G|GG|XG|XXG|RN|U|UNICO)$/.test(u)) return true
  if (/^\d+\(\d+\)\d+$/.test(u) || /^[A-Z]+\(\d+\)[A-Z]+$/.test(u)) {
    return esTalle638Canonico(parseGradaAbierta638(u))
  }
  const n = Number.parseInt(u.replace(/[^\d]/g, ''), 10)
  if (!Number.isFinite(n)) return false
  if (n >= 33 && n <= 45) return false
  return n >= 0 && n <= 24
}

/** Familias canónicas documentadas (UI hint · orden cabecera). */
export const FAMILIAS_TALLE_638 = ['1 · 2 · 3', 'P · M · G · GG', '4 · 6 · 8', '10 · 12 · 14 · 16'] as const
