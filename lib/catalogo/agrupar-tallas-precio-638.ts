/**
 * Segmentación precio × talle — paridad rimec-web `agruparTallasPorPrecio` (F1 · 2.5.1.18).
 * B2C: un `precio_web` por combinación/talle; agrupa para UI de venta individual.
 */
import { parseEtiquetaTalle638, sortTalle638Key } from '@/lib/grada/sort-talla-canonico'

export type TallaConPrecio = {
  combinacion_id: number
  codigo: string
  orden: number
  stock: number
  precio_web: number | null
}

export type GrupoPrecioTallasBazzar = {
  precio: number
  tallas: TallaConPrecio[]
}

export function agruparTallasPorPrecio638(
  tallas: TallaConPrecio[],
  fallbackPrecio: number | null,
): GrupoPrecioTallasBazzar[] {
  const map = new Map<number, TallaConPrecio[]>()

  for (const t of tallas) {
    if (t.stock <= 0) continue
    const precio = t.precio_web != null && t.precio_web > 0 ? t.precio_web : fallbackPrecio
    if (precio == null || !(precio > 0)) continue
    const bucket = map.get(precio) ?? []
    bucket.push(t)
    map.set(precio, bucket)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([precio, list]) => ({
      precio,
      tallas: [...list].sort(
        (a, b) =>
          sortTalle638Key(parseEtiquetaTalle638(a.codigo)) -
          sortTalle638Key(parseEtiquetaTalle638(b.codigo)),
      ),
    }))
}

export function rangoPreciosLabel(grupos: GrupoPrecioTallasBazzar[]): string | null {
  if (!grupos.length) return null
  const fmt = (n: number) => new Intl.NumberFormat('es-PY').format(n)
  if (grupos.length === 1) return fmt(grupos[0]!.precio)
  const min = grupos[0]!.precio
  const max = grupos[grupos.length - 1]!.precio
  if (min === max) return fmt(min)
  return `${fmt(min)} – ${fmt(max)}`
}
