const SUPABASE_URL_RE = /https:\/\/[a-z0-9]+\.supabase\.co/i
const PRODUCT_IMAGE_BUCKET = 'productos'

type ImageCode = string | number | null | undefined

type StockImageInput = {
  linea_codigo: ImageCode
  referencia_codigo: ImageCode
  material_code?: ImageCode
  color_code?: ImageCode
  id_material_f9?: ImageCode
  id_color_f9?: ImageCode
  imagen_url?: string | null
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

function cleanCode(value: ImageCode): string {
  return String(value ?? '').trim()
}

function normalizeStoredImage(value: string | null | undefined): string {
  const clean = String(value ?? '').trim()
  if (!clean) return ''
  if (/^https?:\/\//i.test(clean)) return clean
  return publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, clean)
}

export function productImageFilename(
  lineaCodigo: ImageCode,
  referenciaCodigo: ImageCode,
  materialCodigo: ImageCode,
  colorCodigo: ImageCode,
): string {
  const parts = [lineaCodigo, referenciaCodigo, materialCodigo, colorCodigo].map(cleanCode)
  if (parts.some((part) => !part)) return ''
  return `${parts.join('-')}.jpg`
}

export function productImageUrlFromCodes(
  lineaCodigo: ImageCode,
  referenciaCodigo: ImageCode,
  materialCodigo: ImageCode,
  colorCodigo: ImageCode,
): string {
  const filename = productImageFilename(lineaCodigo, referenciaCodigo, materialCodigo, colorCodigo)
  return filename ? publicStorageObjectUrl(PRODUCT_IMAGE_BUCKET, filename) : ''
}

export function productImageUrlFromStockItem(item: StockImageInput): string {
  const storedImage = normalizeStoredImage(item.imagen_url)
  if (storedImage) return storedImage

  return productImageUrlFromCodes(
    item.linea_codigo,
    item.referencia_codigo,
    item.material_code ?? item.id_material_f9,
    item.color_code ?? item.id_color_f9,
  )
}
