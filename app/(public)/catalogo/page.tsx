import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { StockWebItem } from '@/types/bazzar'
import { ProductoCard, type ProductoAgrupado, type Variante, type Talla } from './ProductoCard'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { getFiltros } from '@/lib/filtros'

export const revalidate = 60
const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos`

interface Props {
  searchParams: { marca?: string; grupo_estilo?: string; colores?: string }
}

export default async function CatalogoPage({ searchParams }: Props) {
  const { marca: marcaFiltro, grupo_estilo: estiloFiltro, colores: coloresFiltroRaw } = searchParams
  const coloresFiltro = coloresFiltroRaw
    ? coloresFiltroRaw.split(',').map(c => c.toLowerCase()).filter(Boolean)
    : []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_stock_web')
    .select('*')
    .order('marca').order('linea_codigo').order('referencia_codigo').order('talla_orden')

  if (error) console.error('[catalogo]', error.message)

  const allRows = data ?? []

  // Obtener filtros con mapas FK desde tablas maestras
  const filtros = await getFiltros(supabase)
  const todasMarcas = filtros?.todasMarcas || []
  const todosEstilos = filtros?.todosEstilos || []

  // Colores desde v_stock_web (no hay tabla maestra de colores con FK aún)
  const { data: coloresData } = await supabase
    .from('v_stock_web')
    .select('color_nombre')
    .gt('stock_web', 0)
    .not('color_nombre', 'is', null)
    .order('color_nombre')

  const todosColores = Array.from(new Set(
    (coloresData ?? [])
      .map(c => c.color_nombre)
      .filter(c => c && c.trim() !== '')
  )).sort()

  // Filtrar usando FK (mapas texto → lineas)
  let rowsFiltradas = [...allRows]

  if (marcaFiltro && filtros?.marcaLineasMap[marcaFiltro]) {
    const lineasValidas = new Set(filtros.marcaLineasMap[marcaFiltro])
    rowsFiltradas = rowsFiltradas.filter(r => lineasValidas.has(r.linea_id))
  }

  if (estiloFiltro && filtros?.estiloLineasMap[estiloFiltro]) {
    const lineasValidas = new Set(filtros.estiloLineasMap[estiloFiltro])
    rowsFiltradas = rowsFiltradas.filter(r => lineasValidas.has(r.linea_id))
  }

  const todos = agruparProductos(rowsFiltradas)
  let productos = todos

  // Filtro de color (aplica a nivel de producto agrupado)
  if (coloresFiltro.length) {
    productos = productos
      .map(p => {
        const variantesMatch = p.variantes.filter(v =>
          coloresFiltro.some(cf => v.color_nombre.toLowerCase().includes(cf))
        )
        if (variantesMatch.length === 0) return null
        const variantesNoMatch = p.variantes.filter(v =>
          !coloresFiltro.some(cf => v.color_nombre.toLowerCase().includes(cf))
        )
        return { ...p, variantes: [...variantesMatch, ...variantesNoMatch] }
      })
      .filter((p): p is ProductoAgrupado => p !== null)
  }

  const totalPares = productos.reduce((s, p) =>
    s + p.variantes.reduce((sv, v) => sv + v.tallas.reduce((st, t) => st + t.stock, 0), 0), 0)

  return (
    <div>
      <Suspense>
        <FiltrosCatalogo
          marcas={todasMarcas}
          estilos={todosEstilos.map((e, i) => ({ id: i, nombre: e }))}
          colores={todosColores}
          totalModelos={productos.length}
          totalPares={totalPares}
        />
      </Suspense>

      {productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5"
               style={{ backgroundColor: '#f1f5f9' }}>🔍</div>
          <p className="font-extrabold text-xl mb-2" style={{ color: '#1E3A5F' }}>
            Sin resultados
          </p>
          <p className="text-sm text-slate-400 mb-6 max-w-xs">
            No encontramos modelos con esos filtros. Probá con otras opciones.
          </p>
          <a href="/catalogo"
             className="text-sm font-bold px-6 py-3 rounded-xl text-white transition-all"
             style={{ backgroundColor: '#F97316' }}>
            Ver todo el catálogo
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {productos.map(p => <ProductoCard key={p.key} producto={p} />)}
        </div>
      )}
    </div>
  )
}

/* ─── Agrupación: linea + referencia + material → variantes de color ─── */
function agruparProductos(items: StockWebItem[]): ProductoAgrupado[] {
  const prodMap = new Map<string, ProductoAgrupado>()
  const varMap  = new Map<string, Map<number, Variante>>()

  for (const item of items) {
    const prodKey = `${item.linea_id}-${item.referencia_id}-${item.id_material_f9}`

    if (!prodMap.has(prodKey)) {
      prodMap.set(prodKey, {
        key:                    prodKey,
        linea_id:               item.linea_id,
        linea_codigo:           item.linea_codigo,
        referencia_id:          item.referencia_id,
        referencia_codigo:      item.referencia_codigo,
        referencia_descripcion: item.referencia_descripcion,
        material_descripcion:   item.material_descripcion,
        marca:                  item.marca,
        precio_web:             item.precio_web,
        descp_grupo_estilo:     item.descp_grupo_estilo ?? null,
        grupo_estilo_id:        item.grupo_estilo_id ?? null,
        variantes:              [],
      })
      varMap.set(prodKey, new Map())
    }

    const materialKeyStr = String(item.material_code ?? item.material_id)
    const colorKeyStr = String(item.color_code ?? item.color_id)
    const colorKeyNum = item.color_id

    const colorMap = varMap.get(prodKey)!
    if (!colorMap.has(colorKeyNum)) {
      colorMap.set(colorKeyNum, {
        id_color_f9:  colorKeyNum,
        color_nombre: item.color_nombre,
        hex_web:      item.hex_web,
        imagen_url:   item.imagen_url
                      ?? `${BUCKET}/${item.linea_codigo}-${item.referencia_codigo}-${materialKeyStr}-${colorKeyStr}.jpg`,
        tallas:       [],
      })
    }
    colorMap.get(colorKeyNum)!.tallas.push({ combinacion_id: item.combinacion_id, codigo: item.talla_codigo, orden: item.talla_orden, stock: item.stock_web })
  }

  return Array.from(prodMap.values()).map(p => {
    p.variantes = Array.from(varMap.get(p.key)!.values())
    p.variantes.forEach(v => v.tallas.sort((a: Talla, b: Talla) => a.orden - b.orden))
    return p
  })
}
