/**
 * Protocolo Imágenes NIIF Bazzar Web — tiers sm/md/lg · LEY integridad visual.
 * Paridad Report (product-image.ts) · RIMEC Web / Tablet depósito.
 */
import {
  resolveProductImageProtocol,
  stems638,
  isKylyColorFkHash,
  isValid638ColorStemToken,
  PROVEEDOR_CONFECCIONES_KYLY,
  type ProductImageProtocol,
} from './productImageProtocol'

const PRODUCT_IMAGE_BUCKET = 'productos'
const SUPABASE_URL_RE = /https:\/\/[a-z0-9]+\.supabase\.co/i
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export type ImageVariant = 'thumb' | 'hero'

export type ProductImageContext = {
  proveedorImportacionId?: number | null
  imagenColorExcel?: string | null
  protocol?: ProductImageProtocol
}

export type StockImageInput = {
  linea_codigo: string | number | null | undefined
  referencia_codigo: string | number | null | undefined
  material_code?: string | number | null | undefined
  color_code?: string | number | null | undefined
  /** Display Kyly — NO usar solo si tiene espacios (PRETO); stem va por F9/Excel. */
  color_nombre?: string | null | undefined
  id_material_f9?: string | number | null | undefined
  id_color_f9?: string | number | null | undefined
  imagen_url?: string | null
  proveedor_importacion_id?: number | null
  ppd_color_codigo?: string | number | null | undefined
}

export type ImagenUrls = {
  imagen_url_thumb: string | null
  imagen_url_hero: string | null
  imagen_candidates_thumb: string[]
  imagen_candidates_hero: string[]
}

export function resolveSupabaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) return ''
  const value = raw.trim()
  const match = value.match(SUPABASE_URL_RE)
  if (match) return match[0].replace(/\/$/, '')
  return value.replace(/^NEXT_PUBLIC_SUPABASE_URL=/i, '').trim().replace(/\/$/, '')
}

export function publicStorageObjectUrl(bucket: string, objectPath: string): string {
  const base = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const cleanPath = objectPath.replace(/^\/+/, '')
  return base && cleanPath ? `${base}/storage/v1/object/public/${bucket}/${cleanPath}` : ''
}

function normCodigo(v: string | number | null | undefined): string {
  if (v == null) return ''
  const n = Number(v)
  if (Number.isFinite(n) && n === Math.floor(n)) return String(Math.floor(n))
  return String(v).trim().replace(/\s+/g, '')
}

function joinStem(parts: string[]): string {
  return parts.filter(Boolean).join('-')
}

function pushUnique(out: string[], value: string) {
  if (value && !out.includes(value)) out.push(value)
}

/** URL absoluta Storage → basename + URL limpia (evita garbage path). */
export function coerceImagenNombreField(raw: string | null | undefined): {
  basename: string | null
  absoluteUrl: string | null
} {
  const s = String(raw ?? '').trim()
  if (!s) return { basename: null, absoluteUrl: null }

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      const path = decodeURIComponent(u.pathname)
      const m = path.match(/\/productos\/(?:(?:sm|md|lg|thumbs)\/)?(.+)$/i)
      const file = m?.[1]
        ? m[1].replace(/^(sm|md|lg|thumbs)\//i, '')
        : (path.split('/').pop() ?? '')
      return {
        basename: file || null,
        absoluteUrl: s.split('?')[0] || s,
      }
    } catch {
      return { basename: null, absoluteUrl: s.split('?')[0] || s }
    }
  }

  const base = s
    .replace(/^productos\//i, '')
    .replace(/^(sm|md|lg|thumbs)\//i, '')
    .replace(/^\/+/, '')
  return { basename: base || null, absoluteUrl: null }
}

export function resolveMaterialCodigoImagen(
  item: Pick<
    StockImageInput,
    'linea_codigo' | 'material_code' | 'id_material_f9' | 'proveedor_importacion_id'
  >,
): string {
  const fromPilar = normCodigo(item.material_code)
  if (fromPilar && fromPilar !== '—') return fromPilar
  const fromF9 = normCodigo(item.id_material_f9)
  if (fromF9) return fromF9
  const linea = normCodigo(item.linea_codigo)
  if (Number(item.proveedor_importacion_id) === PROVEEDOR_CONFECCIONES_KYLY && linea) {
    return `K${linea}`
  }
  return ''
}

export function resolveColorCodigoImagen(
  item: Pick<
    StockImageInput,
    'color_code' | 'id_color_f9' | 'ppd_color_codigo' | 'proveedor_importacion_id'
  >,
): string {
  const ppd = normCodigo(item.ppd_color_codigo)
  if (ppd && !isKylyColorFkHash(ppd)) return ppd
  const fromPilar = normCodigo(item.color_code)
  if (fromPilar && !isKylyColorFkHash(fromPilar)) return fromPilar
  const f9 = normCodigo(item.id_color_f9)
  if (f9 && !isKylyColorFkHash(f9)) return f9
  return ''
}

/**
 * Color para stem 638: Excel/F9/código numérico.
 * Prohibido nombre descriptivo con espacios («PRETO») y FK hash 638001….
 */
export function resolveImagenColorExcel638(
  item: Pick<
    StockImageInput,
    'color_nombre' | 'ppd_color_codigo' | 'id_color_f9' | 'color_code'
  >,
): string {
  // Orden: F9/PPD/código pilar antes que nombre (nombre suele ser «PRETO»).
  const candidates = [
    item.ppd_color_codigo,
    item.id_color_f9,
    item.color_code,
    item.color_nombre,
  ]
  for (const c of candidates) {
    const raw = String(c ?? '').trim()
    if (isValid638ColorStemToken(raw)) return raw
  }
  return ''
}

/** flat → sm/md (thumb) o lg/md/sm (hero) → thumbs — paridad Report. */
function stemCandidates(stem: string, variant: ImageVariant): string[] {
  const tiers: ('sm' | 'md' | 'lg')[] = variant === 'hero' ? ['lg', 'md', 'sm'] : ['sm', 'md']
  const urls: string[] = []
  for (const ext of IMAGE_EXTENSIONS) {
    const flat = publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, `${stem}${ext}`)
    pushUnique(urls, flat)
    for (const tier of tiers) {
      pushUnique(urls, publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, `${tier}/${stem}${ext}`))
    }
    pushUnique(urls, publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, `thumbs/${stem}${ext}`))
  }
  return urls
}

export function productImageCandidates(
  linea: string,
  referencia: string,
  material: string | number,
  color: string | number,
  variant: ImageVariant = 'thumb',
  ctx?: ProductImageContext,
): string[] {
  const protocol =
    ctx?.protocol ??
    resolveProductImageProtocol({
      proveedorImportacionId: ctx?.proveedorImportacionId,
      linea,
      referencia,
      material,
    })

  if (protocol === '638') {
    const colorKeys = [ctx?.imagenColorExcel, color]
      .map(c => String(c ?? '').trim())
      .filter(c => isValid638ColorStemToken(c))
    const urls: string[] = []
    const seenStem = new Set<string>()
    for (const colorKey of colorKeys) {
      for (const stem of stems638(linea, colorKey)) {
        if (seenStem.has(stem)) continue
        seenStem.add(stem)
        for (const u of stemCandidates(stem, variant)) pushUnique(urls, u)
      }
    }
    return urls
  }

  const L = normCodigo(linea)
  const R = normCodigo(referencia)
  const M = normCodigo(material)
  const C = normCodigo(color)
  if (!L || !R) return []

  const urls: string[] = []
  const stem4 = joinStem([L, R, M, C])
  if (stem4.split('-').length >= 4) {
    for (const u of stemCandidates(stem4, variant)) pushUnique(urls, u)
  }
  const stemLr = joinStem([L, R])
  if (stemLr) {
    for (const u of stemCandidates(stemLr, variant)) pushUnique(urls, u)
  }
  return urls
}

export function enrichImagenUrlsFromStockItem(item: StockImageInput): ImagenUrls {
  const linea = normCodigo(item.linea_codigo)
  const referencia = normCodigo(item.referencia_codigo)
  const material = resolveMaterialCodigoImagen(item)
  const color = resolveColorCodigoImagen(item)
  const es638 = Number(item.proveedor_importacion_id) === PROVEEDOR_CONFECCIONES_KYLY
  const excelColor = es638
    ? resolveImagenColorExcel638(item)
    : String(item.color_nombre ?? '').trim() ||
      (item.ppd_color_codigo != null ? String(item.ppd_color_codigo).trim() : '')

  const ctx: ProductImageContext = {
    proveedorImportacionId: item.proveedor_importacion_id,
    imagenColorExcel: excelColor || undefined,
  }

  const { absoluteUrl, basename } = coerceImagenNombreField(item.imagen_url)
  const thumbMol = productImageCandidates(linea, referencia, material, color, 'thumb', ctx)
  const heroMol = productImageCandidates(linea, referencia, material, color, 'hero', ctx)

  const thumb: string[] = []
  const hero: string[] = []
  if (absoluteUrl) {
    pushUnique(thumb, absoluteUrl)
    pushUnique(hero, absoluteUrl)
  }
  if (basename) {
    for (const u of stemCandidates(basename.replace(/\.(jpe?g|png|webp)$/i, ''), 'thumb')) {
      pushUnique(thumb, u)
    }
    for (const u of stemCandidates(basename.replace(/\.(jpe?g|png|webp)$/i, ''), 'hero')) {
      pushUnique(hero, u)
    }
  }
  for (const u of thumbMol) pushUnique(thumb, u)
  for (const u of heroMol) pushUnique(hero, u)

  return {
    imagen_url_thumb: thumb[0] ?? null,
    imagen_url_hero: hero[0] ?? null,
    imagen_candidates_thumb: thumb,
    imagen_candidates_hero: hero,
  }
}

/** Compat carrito — thumb NIIF */
export function productImageUrlFromStockItem(item: StockImageInput): string {
  const stored = String(item.imagen_url ?? '').trim()
  if (stored && /^https?:\/\//i.test(stored)) {
    const { absoluteUrl } = coerceImagenNombreField(stored)
    if (absoluteUrl) return absoluteUrl
  }
  return enrichImagenUrlsFromStockItem(item).imagen_url_thumb ?? ''
}

/** Compat scripts legacy — stem 654 L-R-M-C. */
export function productImageUrlFromCodes(
  linea: string | number,
  referencia: string | number,
  material: string | number,
  color: string | number,
): string {
  return productImageCandidates(String(linea), String(referencia), material, color, 'thumb')[0] ?? ''
}

export function productImageFallbackStyle(): { background: string } {
  return { background: '#ffffff' }
}
