/**
 * Protocolo Imágenes NIIF Bazzar Web — tiers sm/md/lg · LEY integridad visual.
 * Paridad RIMEC Web / Tablet depósito.
 */
import {
  resolveProductImageProtocol,
  stems638,
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
  /** Kyly 638 — color Excel (K9010). NO usar color_code bigint del pilar. */
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

export function resolveMaterialCodigoImagen(item: Pick<StockImageInput, 'linea_codigo' | 'material_code' | 'id_material_f9' | 'proveedor_importacion_id'>): string {
  const fromPilar = normCodigo(item.material_code)
  if (fromPilar && fromPilar !== '—') return fromPilar
  const fromF9 = normCodigo(item.id_material_f9)
  if (fromF9) return fromF9
  const linea = normCodigo(item.linea_codigo)
  if (item.proveedor_importacion_id === PROVEEDOR_CONFECCIONES_KYLY && linea) return `K${linea}`
  return ''
}

export function resolveColorCodigoImagen(item: Pick<StockImageInput, 'color_code' | 'id_color_f9' | 'ppd_color_codigo' | 'proveedor_importacion_id'>): string {
  const ppd = normCodigo(item.ppd_color_codigo)
  if (ppd) return ppd
  const fromPilar = normCodigo(item.color_code)
  if (fromPilar) return fromPilar
  return normCodigo(item.id_color_f9)
}

function stemCandidates(stem: string, variant: ImageVariant): string[] {
  const tiers: ('sm' | 'md' | 'lg')[] = variant === 'hero' ? ['lg', 'md', 'sm'] : ['sm', 'md']
  const urls: string[] = []
  for (const ext of IMAGE_EXTENSIONS) {
    for (const tier of tiers) {
      const u = publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, `${tier}/${stem}${ext}`)
      if (u && !urls.includes(u)) urls.push(u)
    }
    const flat = publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, `${stem}${ext}`)
    if (flat && !urls.includes(flat)) urls.push(flat)
    const thumb = publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, `thumbs/${stem}${ext}`)
    if (thumb && !urls.includes(thumb)) urls.push(thumb)
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
  const protocol = ctx?.protocol ?? resolveProductImageProtocol({
    proveedorImportacionId: ctx?.proveedorImportacionId,
  })

  if (protocol === '638') {
    const colorFor638 = ctx?.imagenColorExcel ?? color
    const urls: string[] = []
    for (const stem of stems638(linea, colorFor638)) {
      for (const u of stemCandidates(stem, variant)) {
        if (!urls.includes(u)) urls.push(u)
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
    for (const u of stemCandidates(stem4, variant)) {
      if (!urls.includes(u)) urls.push(u)
    }
  }
  const stemLr = joinStem([L, R])
  if (stemLr) {
    for (const u of stemCandidates(stemLr, variant)) {
      if (!urls.includes(u)) urls.push(u)
    }
  }
  return urls
}

export function enrichImagenUrlsFromStockItem(item: StockImageInput): ImagenUrls {
  const linea = normCodigo(item.linea_codigo)
  const referencia = normCodigo(item.referencia_codigo)
  const material = resolveMaterialCodigoImagen(item)
  const color = resolveColorCodigoImagen(item)
  // 638: color Excel (col.nombre / K9010). ppd_color_codigo solo si no hay nombre.
  // Prohibido armar L_color_code (ej. 107638_638001277005) — Ley 2.01.04.021 §2.2
  const excelColor =
    String(item.color_nombre ?? '').trim() ||
    (item.ppd_color_codigo != null ? String(item.ppd_color_codigo).trim() : '')
  const ctx: ProductImageContext = {
    proveedorImportacionId: item.proveedor_importacion_id,
    imagenColorExcel: excelColor || undefined,
  }

  const thumb = productImageCandidates(linea, referencia, material, color, 'thumb', ctx)
  const hero = productImageCandidates(linea, referencia, material, color, 'hero', ctx)

  return {
    imagen_url_thumb: thumb[0] ?? null,
    imagen_url_hero: hero[0] ?? null,
    imagen_candidates_thumb: thumb,
    imagen_candidates_hero: hero,
  }
}

/** Compat carrito — devuelve thumb NIIF */
export function productImageUrlFromStockItem(item: StockImageInput): string {
  const stored = String(item.imagen_url ?? '').trim()
  if (stored && /^https?:\/\//i.test(stored)) return stored
  return enrichImagenUrlsFromStockItem(item).imagen_url_thumb ?? ''
}

export function productImageFallbackStyle(): { background: string } {
  return { background: '#ffffff' }
}
