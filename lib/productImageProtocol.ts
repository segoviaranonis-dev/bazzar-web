/**
 * Protocolo Imágenes Nexus — ramas 654 calzado / 638 Kyly (LEY 2.01.04.021)
 * Paridad Report · RIMEC Web · Tablet Bazzar.
 */

export const PROVEEDOR_CALZADO = 654
export const PROVEEDOR_CONFECCIONES_KYLY = 638
export const TIPO_V2_CALZADO = 1
export const TIPO_V2_CONFECCIONES = 2

export type ProductImageProtocol = '654' | '638'

export function resolveProductImageProtocol(input: {
  proveedorImportacionId?: number | null
  tipoV2Id?: number | null
  imagenNombre?: string | null
  material?: string | number | null
  linea?: string | number | null
  referencia?: string | number | null
}): ProductImageProtocol {
  return inferProtocolFromProductCodes(input)
}

export function inferProtocolFromProductCodes(input: {
  proveedorImportacionId?: number | null
  tipoV2Id?: number | null
  imagenNombre?: string | null
  material?: string | number | null
  linea?: string | number | null
  referencia?: string | number | null
}): ProductImageProtocol {
  const fromName = detectProtocolFromFileStem(input.imagenNombre)
  if (fromName) return fromName

  // PostgREST/pg a veces devuelve proveedor como string ('638') — Number() obligatorio.
  const p = Number(input.proveedorImportacionId)
  const t = Number(input.tipoV2Id)
  if (p === PROVEEDOR_CONFECCIONES_KYLY || t === TIPO_V2_CONFECCIONES) return '638'

  const mat = String(input.material ?? '').trim()
  const linea = String(input.linea ?? '').trim()
  const ref = String(input.referencia ?? '').trim()
  if (mat.startsWith('638') || linea.startsWith('638') || ref.startsWith('638.')) {
    return '638'
  }

  return '654'
}

export function detectProtocolFromFileStem(
  raw: string | null | undefined,
): ProductImageProtocol | null {
  const s = stripTierFromPath(String(raw ?? '').trim())
  if (!s) return null
  const stem = s.replace(/\.(jpe?g|png|webp)$/i, '')
  if (!stem) return null
  if (stem.includes('_') && !stem.includes('-')) return '638'
  if (stem.includes('-')) return '654'
  return null
}

function stripTierFromPath(path: string): string {
  let s = path
  const marker = '/storage/v1/object/public/productos/'
  const idx = s.indexOf(marker)
  if (idx >= 0) {
    try {
      s = decodeURIComponent(s.slice(idx + marker.length).split('?')[0]?.split('#')[0] ?? '')
    } catch {
      s = s.slice(idx + marker.length).split('?')[0]?.split('#')[0] ?? ''
    }
  }
  return s
    .replace(/^productos\//i, '')
    .replace(/^(sm|md|lg|thumbs)\//i, '')
    .replace(/^\/+/, '')
}

function canonNumSegment(v: string | number | null | undefined): string {
  if (v == null) return ''
  const t = String(v).trim().replace(/\s+/g, '')
  return /^\d+\.0$/.test(t) ? t.slice(0, -2) : t
}

/** FK color legacy 638 (`638001…`) — no es código Kyly legible (K0460). */
export function isKylyColorFkHash(color: string | number | null | undefined): boolean {
  const s = String(color ?? '').trim()
  if (!/^\d+$/.test(s)) return false
  const n = Number(s)
  return n >= 638_001_000_000 && n <= 638_001_000_000 + 999_999_999
}

/** Token stem 638: K#### / dígitos. Rechaza PRETO, AZUL MARINHO, FK hash. */
export function isValid638ColorStemToken(color: string | number | null | undefined): boolean {
  const raw = String(color ?? '').trim()
  if (!raw || /\s/.test(raw) || isKylyColorFkHash(raw)) return false
  const noK = raw.replace(/^k/i, '')
  return /^\d+$/.test(noK)
}

export function color638StemVariants(color: string | number | null | undefined): string[] {
  const raw = String(color ?? '').trim()
  if (!isValid638ColorStemToken(raw)) return []
  const noK = raw.replace(/^k/i, '')
  const out = new Set<string>()
  out.add(noK)
  const stripped = noK.replace(/^0+/, '')
  if (stripped) out.add(stripped)
  out.add(noK.padStart(4, '0'))
  return Array.from(out).filter(Boolean)
}

export function stems638(
  linea: string | number | null | undefined,
  color: string | number | null | undefined,
  lineaFallback?: string | number | null | undefined,
): string[] {
  const lineas = new Set<string>()
  for (const src of [linea, lineaFallback]) {
    const t = canonNumSegment(src)
    if (t) lineas.add(t)
  }
  const colors = color638StemVariants(color)
  if (!lineas.size || !colors.length) return []

  const stems = new Set<string>()
  for (const L of lineas) {
    for (const C of colors) {
      stems.add(`${L}_${C}`)
    }
  }
  return Array.from(stems)
}

export function stem654(
  linea: string | number | null | undefined,
  referencia: string | number | null | undefined,
  material: string | number | null | undefined,
  color: string | number | null | undefined,
): string | null {
  const parts = [linea, referencia, material, color]
    .map(v => canonNumSegment(v))
    .filter(Boolean)
  if (parts.length < 2) return null
  if (parts.length >= 4) return parts.slice(0, 4).join('-')
  return parts.slice(0, 2).join('-')
}

export function productImagePrimaryStem(input: {
  protocol?: ProductImageProtocol
  proveedorImportacionId?: number | null
  tipoV2Id?: number | null
  imagenNombre?: string | null
  imagenColorExcel?: string | null
  linea: string | number | null | undefined
  referencia?: string | number | null | undefined
  material?: string | number | null | undefined
  color?: string | number | null | undefined
}): string | null {
  const protocol = input.protocol ?? resolveProductImageProtocol(input)
  if (protocol === '638') {
    for (const c of [input.imagenColorExcel, input.color]) {
      const stem = stems638(input.linea, c)[0]
      if (stem) return stem
    }
    return null
  }
  return stem654(input.linea, input.referencia, input.material, input.color)
}
