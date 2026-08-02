import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { StockWebItem } from '@/types/bazzar'
import { ProductoCard, type ProductoAgrupado, type Variante, type Talla } from './ProductoCard'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { getFiltros } from '@/lib/filtros'
import { enrichImagenUrlsFromStockItem } from '@/lib/product-image'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'
import { sortTallaCatalogo } from '@/lib/grada/sort-talla-canonico'
import {
  esPrendasPe,
  loadPePrendasAmTalleIndex,
  loadPpdAmTalleIndex,
  remapTallas638DesdePpd,
  resolveAmTallesForProducto,
} from '@/lib/catalogo/enrich-grada-638'
import {
  calzadoExcluyeCarterasPorDefecto,
  parseTipoGruposParam,
  rowMatchesTipoGrupos,
  sanitizeTipoGruposParaRamo,
  type RamoTipoBazzar,
  type TipoGrupoId,
} from '@/lib/filtros/filtro-tipo-canonico'

export const revalidate = 60

/** Columnas tipadas — select(*) con rol anon hace timeout en PostgREST (vista pesada). */
const CATALOGO_SELECT = [
  'combinacion_id',
  'marca',
  'linea_id',
  'proveedor_importacion_id',
  'linea_codigo',
  'linea_descripcion',
  'referencia_id',
  'referencia_codigo',
  'referencia_descripcion',
  'material_id',
  'material_code',
  'material_descripcion',
  'color_id',
  'color_code',
  'color_nombre',
  'hex_web',
  'ppd_color_codigo',
  'imagen_url',
  'talla_codigo',
  'talla_orden',
  'stock_web',
  'precio_web',
  'stock_sano_estado',
  'stock_sano_caso',
  'descp_grupo_estilo',
  'grupo_estilo_id',
  'genero_id',
  'descp_genero',
].join(',')

interface Props {
  searchParams: {
    marca?: string
    grupo_estilo?: string
    colores?: string
    ramo_tipo?: string
    tipo_grupos?: string
    q?: string
  }
}

function parseRamo(raw: string | undefined): RamoTipoBazzar {
  const u = String(raw ?? '').trim().toUpperCase()
  if (u === 'CALZADO' || u === 'CONFECCIONES') return u
  return ''
}

export default async function CatalogoPage({ searchParams }: Props) {
  const { marca: marcaFiltro, grupo_estilo: estiloFiltro, colores: coloresFiltroRaw } =
    searchParams
  const qFiltro = String(searchParams.q ?? '')
    .trim()
    .toLowerCase()
  const coloresFiltro = coloresFiltroRaw
    ? coloresFiltroRaw.split(',').map((c) => c.toLowerCase()).filter(Boolean)
    : []
  const ramoFiltro = parseRamo(searchParams.ramo_tipo)
  const tipoFiltro = sanitizeTipoGruposParaRamo(
    parseTipoGruposParam(searchParams.tipo_grupos),
    ramoFiltro || undefined,
  )

  const supabase = await createClient()
  let query = supabase.from('v_stock_web').select(CATALOGO_SELECT)
  query = soloVendibleCatalogo(query)
  const { data, error } = await query

  if (error) console.error('[catalogo]', error.message)

  const allRows = ([...(data ?? [])] as unknown as StockWebItem[]).sort((a, b) => {
    const m = String(a.marca ?? '').localeCompare(String(b.marca ?? ''), 'es')
    if (m) return m
    const l = String(a.linea_codigo ?? '').localeCompare(String(b.linea_codigo ?? ''), 'es', {
      numeric: true,
    })
    if (l) return l
    const r = String(a.referencia_codigo ?? '').localeCompare(
      String(b.referencia_codigo ?? ''),
      'es',
      { numeric: true },
    )
    if (r) return r
    return (Number(a.talla_orden) || 0) - (Number(b.talla_orden) || 0)
  })

  const filtros = await getFiltros(supabase)
  const todasMarcas = filtros?.todasMarcas || []
  const todosEstilos = filtros?.todosEstilos || []

  const { data: coloresData } = await soloVendibleCatalogo(
    supabase.from('v_stock_web').select('color_nombre'),
  )
    .not('color_nombre', 'is', null)
    .order('color_nombre')

  const todosColores = Array.from(
    new Set(
      (coloresData ?? [])
        .map((c) => c.color_nombre)
        .filter((c) => c && c.trim() !== ''),
    ),
  ).sort()

  let rowsFiltradas = [...allRows]

  // Ramo siamese: 654 calzado · 638 confecciones
  if (ramoFiltro === 'CALZADO') {
    rowsFiltradas = rowsFiltradas.filter((r) => Number(r.proveedor_importacion_id) === 654)
  } else if (ramoFiltro === 'CONFECCIONES') {
    rowsFiltradas = rowsFiltradas.filter((r) => Number(r.proveedor_importacion_id) === 638)
  }

  // Tipo siamese (Normal / Promo / Liquidación / Carteras)
  if (tipoFiltro.length) {
    rowsFiltradas = rowsFiltradas.filter((r) =>
      rowMatchesTipoGrupos(
        {
          stock_sano_caso: r.stock_sano_caso,
          descp_grupo_estilo: r.descp_grupo_estilo,
        },
        tipoFiltro,
      ),
    )
  } else if (
    calzadoExcluyeCarterasPorDefecto({
      ramo_tipo: ramoFiltro,
      tipo_grupos: tipoFiltro,
    })
  ) {
    // Mario Bros: Calzado sin carteras por defecto
    rowsFiltradas = rowsFiltradas.filter(
      (r) =>
        !rowMatchesTipoGrupos(
          {
            stock_sano_caso: r.stock_sano_caso,
            descp_grupo_estilo: r.descp_grupo_estilo,
          },
          ['carteras'] as TipoGrupoId[],
        ),
    )
  }

  if (marcaFiltro && filtros?.marcaLineasMap[marcaFiltro]) {
    const lineasValidas = new Set(filtros.marcaLineasMap[marcaFiltro])
    rowsFiltradas = rowsFiltradas.filter((r) => lineasValidas.has(r.linea_id))
  }

  if (estiloFiltro && filtros?.estiloLineasMap[estiloFiltro]) {
    const lineasValidas = new Set(filtros.estiloLineasMap[estiloFiltro])
    rowsFiltradas = rowsFiltradas.filter((r) => lineasValidas.has(r.linea_id))
  }

  if (qFiltro) {
    rowsFiltradas = rowsFiltradas.filter((r) => {
      const blob = [
        r.marca,
        r.linea_codigo,
        r.referencia_codigo,
        r.material_code,
        r.color_nombre,
        r.descp_grupo_estilo,
        r.referencia_descripcion,
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ')
      return blob.includes(qFiltro)
    })
  }

  const lineas638 = Array.from(
    new Set(
      rowsFiltradas
        .filter((r) => Number(r.proveedor_importacion_id) === 638)
        .map((r) => String(r.linea_codigo).trim())
        .filter(Boolean),
    ),
  )
  const lineas654 = Array.from(
    new Set(
      rowsFiltradas
        .filter((r) => Number(r.proveedor_importacion_id) === 654)
        .map((r) => String(r.linea_codigo).trim())
        .filter(Boolean),
    ),
  )
  const [ppdIndex, pePrendasIndex] = await Promise.all([
    loadPpdAmTalleIndex(lineas638),
    loadPePrendasAmTalleIndex(lineas654),
  ])

  const todos = agruparProductos(rowsFiltradas, ppdIndex, pePrendasIndex).filter(
    (p) => p.variantes.length > 0,
  )
  let productos = todos

  if (coloresFiltro.length) {
    productos = productos
      .map((p) => {
        const variantesMatch = p.variantes.filter((v) =>
          coloresFiltro.some((cf) => v.color_nombre.toLowerCase().includes(cf)),
        )
        if (variantesMatch.length === 0) return null
        const variantesNoMatch = p.variantes.filter(
          (v) => !coloresFiltro.some((cf) => v.color_nombre.toLowerCase().includes(cf)),
        )
        return { ...p, variantes: [...variantesMatch, ...variantesNoMatch] }
      })
      .filter((p): p is ProductoAgrupado => p !== null)
  }

  const totalUnidades = productos.reduce(
    (s, p) =>
      s + p.variantes.reduce((sv, v) => sv + v.tallas.reduce((st, t) => st + t.stock, 0), 0),
    0,
  )

  const unidadLabel =
    ramoFiltro === 'CONFECCIONES'
      ? 'prendas'
      : ramoFiltro === 'CALZADO'
        ? 'pares'
        : 'u'

  // Marcas/estilos del universo filtrado por ramo (cascada simple)
  const marcasVisibles =
    ramoFiltro || tipoFiltro.length
      ? Array.from(new Set(productos.map((p) => p.marca).filter(Boolean))).sort()
      : todasMarcas
  const estilosVisibles =
    ramoFiltro || tipoFiltro.length
      ? Array.from(
          new Set(
            productos.map((p) => p.descp_grupo_estilo).filter((e): e is string => !!e),
          ),
        ).sort()
      : todosEstilos

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:sticky lg:top-16 lg:w-auto lg:max-w-md">
        <Suspense>
          <FiltrosCatalogo
            marcas={marcasVisibles}
            estilos={estilosVisibles.map((e, i) => ({ id: i, nombre: e }))}
            colores={todosColores}
            totalModelos={productos.length}
            totalUnidades={totalUnidades}
            unidadLabel={unidadLabel}
          />
        </Suspense>
      </aside>

      <div className="min-w-0 flex-1">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center lg:py-40">
            <div
              className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
              style={{ backgroundColor: '#f1f5f9' }}
            >
              🔍
            </div>
            <p className="mb-2 text-xl font-extrabold" style={{ color: '#1E3A5F' }}>
              Sin resultados
            </p>
            <p className="mb-6 max-w-xs text-sm text-slate-400">
              No encontramos modelos con esos filtros. Probá con otras opciones.
            </p>
            <a
              href="/catalogo"
              className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-all"
              style={{ backgroundColor: '#F97316' }}
            >
              Ver todo el catálogo
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {productos.map((p) => (
              <ProductoCard key={p.key} producto={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Agrupación: linea + referencia + material → variantes de color ─── */
function agruparProductos(
  items: StockWebItem[],
  ppdIndex: Map<string, string[]>,
  pePrendasIndex: Map<string, string[]>,
): ProductoAgrupado[] {
  const prodMap = new Map<string, ProductoAgrupado>()
  const varMap = new Map<string, Map<number, Variante>>()

  for (const item of items) {
    const prodKey = `${item.linea_id}-${item.referencia_id}-${item.material_id}`

    if (!prodMap.has(prodKey)) {
      const es638 = Number(item.proveedor_importacion_id) === 638
      const esPrenda654 =
        !es638 &&
        esPrendasPe(pePrendasIndex, item.linea_codigo, item.referencia_codigo)
      prodMap.set(prodKey, {
        key: prodKey,
        linea_id: item.linea_id,
        linea_codigo: item.linea_codigo,
        referencia_id: item.referencia_id,
        referencia_codigo: item.referencia_codigo,
        referencia_descripcion: item.referencia_descripcion,
        material_descripcion: item.material_descripcion,
        marca: item.marca,
        precio_web: item.precio_web,
        descp_grupo_estilo: item.descp_grupo_estilo ?? null,
        grupo_estilo_id: item.grupo_estilo_id ?? null,
        proveedor_importacion_id: item.proveedor_importacion_id ?? null,
        stock_sano_caso: item.stock_sano_caso ?? null,
        unidad_stock: es638 || esPrenda654 ? 'prendas' : 'pares',
        variantes: [],
      })
      varMap.set(prodKey, new Map())
    }

    const colorKeyNum = item.color_id
    const colorMap = varMap.get(prodKey)!
    if (!colorMap.has(colorKeyNum)) {
      const imgs = enrichImagenUrlsFromStockItem(item)
      colorMap.set(colorKeyNum, {
        id_color_f9: colorKeyNum,
        color_nombre: item.color_nombre,
        hex_web: item.hex_web,
        imagen_url: imgs.imagen_url_thumb ?? '',
        imagen_candidates_thumb: imgs.imagen_candidates_thumb,
        imagen_candidates_hero: imgs.imagen_candidates_hero,
        imagen_item: {
          linea_codigo: item.linea_codigo,
          referencia_codigo: item.referencia_codigo,
          material_code: item.material_code,
          color_code: item.color_code,
          color_nombre: item.color_nombre,
          id_material_f9: item.id_material_f9,
          id_color_f9: item.id_color_f9,
          proveedor_importacion_id: item.proveedor_importacion_id,
          ppd_color_codigo: item.ppd_color_codigo,
        },
        tallas: [],
      })
    }

    const variante = colorMap.get(colorKeyNum)!
    if (!variante.tallas.some((t) => t.combinacion_id === item.combinacion_id)) {
      variante.tallas.push({
        combinacion_id: item.combinacion_id,
        codigo: item.talla_codigo,
        orden: item.talla_orden,
        stock: item.stock_web,
      })
    }
  }

  return Array.from(prodMap.values()).map((p) => {
    p.variantes = Array.from(varMap.get(p.key)!.values())
    const es638 = Number(p.proveedor_importacion_id) === 638
    const esPrenda654 = p.unidad_stock === 'prendas' && !es638
    p.variantes.forEach((v) => {
      if (es638) {
        const colorRaw = v.imagen_item.color_code ?? v.imagen_item.ppd_color_codigo
        const am = resolveAmTallesForProducto(
          ppdIndex,
          p.linea_codigo,
          p.referencia_codigo,
          colorRaw != null ? String(colorRaw) : null,
        )
        v.tallas = remapTallas638DesdePpd(v.tallas, am)
      } else if (esPrenda654) {
        const am = resolveAmTallesForProducto(
          pePrendasIndex,
          p.linea_codigo,
          p.referencia_codigo,
          null,
        )
        v.tallas = remapTallas638DesdePpd(v.tallas, am)
      } else {
        v.tallas.sort((a: Talla, b: Talla) =>
          sortTallaCatalogo(a.codigo, b.codigo, p.proveedor_importacion_id),
        )
        v.tallas = v.tallas.filter((t) => t.stock > 0)
      }
    })
    p.variantes = p.variantes.filter((v) => v.tallas.length > 0)
    return p
  })
}
