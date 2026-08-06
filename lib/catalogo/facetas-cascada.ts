/**
 * Facetas catálogo Bazzar — replace (no universo) · paridad 2.2.1.42 / 2.2.1.44.
 * Dimensión acota molécula: Estilo → Línea → Material → Color.
 * Canal ALM_WEB (sin CP/PE); tipología AB-CR se suma cuando haya señales en stock.
 */
import type { StockWebItem } from '@/types/bazzar'

export type FacetasCatalogo = {
  marcas: string[]
  generos: { id: number; nombre: string }[]
  estilos: { id: number; nombre: string }[]
  lineas: string[]
  materiales: string[]
  colores: string[]
}

function uniqSort(xs: string[]): string[] {
  return Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true }),
  )
}

/** Facetas desde filas ya filtradas (replace meta — nunca merge universo). */
export function buildFacetasDesdeFilas(rows: StockWebItem[]): FacetasCatalogo {
  const marcas = uniqSort(rows.map((r) => String(r.marca ?? '')))
  const generoMap = new Map<number, string>()
  for (const r of rows) {
    const id = Number(r.genero_id)
    const nom = String(r.descp_genero ?? '').trim()
    if (Number.isFinite(id) && id > 0 && nom) generoMap.set(id, nom)
  }
  const generos = [...generoMap.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const estiloMap = new Map<number, string>()
  for (const r of rows) {
    const id = Number(r.grupo_estilo_id)
    const nom = String(r.descp_grupo_estilo ?? '').trim()
    if (Number.isFinite(id) && id > 0 && nom) estiloMap.set(id, nom)
    else if (nom) estiloMap.set(-estiloMap.size - 1, nom)
  }
  const estilos = [...estiloMap.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const lineas = uniqSort(rows.map((r) => String(r.linea_codigo ?? '')))
  const materiales = uniqSort(
    rows.map((r) =>
      String(r.material_descripcion ?? r.material_code ?? '')
        .trim()
        .split(/[\s/\-]+/)[0] ?? '',
    ),
  )
  const colores = uniqSort(rows.map((r) => String(r.color_nombre ?? '')))

  return { marcas, generos, estilos, lineas, materiales, colores }
}

/** Leave-one-out: filas para faceta X ignorando filtro X (cascada opciones). */
export function rowsForFacet(
  rows: StockWebItem[],
  exclude:
    | 'marca'
    | 'genero'
    | 'estilo'
    | 'linea'
    | 'material'
    | 'color'
    | null,
  f: {
    marca?: string
    genero_id?: number
    grupo_estilo?: string
    linea?: string
    material?: string
    colores?: string[]
  },
): StockWebItem[] {
  return rows.filter((r) => {
    if (exclude !== 'marca' && f.marca) {
      if (String(r.marca ?? '').toLowerCase() !== f.marca.toLowerCase()) return false
    }
    if (exclude !== 'genero' && f.genero_id) {
      if (Number(r.genero_id) !== f.genero_id) return false
    }
    if (exclude !== 'estilo' && f.grupo_estilo) {
      if (
        String(r.descp_grupo_estilo ?? '').toLowerCase() !== f.grupo_estilo.toLowerCase()
      )
        return false
    }
    if (exclude !== 'linea' && f.linea) {
      if (String(r.linea_codigo ?? '') !== f.linea) return false
    }
    if (exclude !== 'material' && f.material) {
      const fam = String(r.material_descripcion ?? r.material_code ?? '')
        .trim()
        .split(/[\s/\-]+/)[0]
        ?.toLowerCase()
      if (fam !== f.material.toLowerCase()) return false
    }
    if (exclude !== 'color' && f.colores?.length) {
      const cn = String(r.color_nombre ?? '').toLowerCase()
      if (!f.colores.some((c) => cn.includes(c.toLowerCase()))) return false
    }
    return true
  })
}
