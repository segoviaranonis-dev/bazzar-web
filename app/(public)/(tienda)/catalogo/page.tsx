import { Suspense } from 'react'
import type { StockWebItem } from '@/types/bazzar'
import { ProductoCard, type ProductoAgrupado, type Variante, type Talla } from './ProductoCard'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { CatalogoShell } from './CatalogoShell'
import { enrichImagenUrlsFromStockItem } from '@/lib/product-image'
import { sortTallaCatalogo } from '@/lib/grada/sort-talla-canonico'
import {
  aplicarPreciosPpdATallas638,
  esPrendasPe,
  loadPePrendasAmTalleIndex,
  loadPpd638Enrich,
  remapTallas638DesdePpd,
  resolveAmTallesForProducto,
  type PpdLpnPorTalleIndex,
} from '@/lib/catalogo/enrich-grada-638'
import { getCatalogoSnapshot } from '@/lib/catalogo/catalogo-snapshot'
import {
  buildFacetasDesdeFilas,
  rowsForFacet,
} from '@/lib/catalogo/facetas-cascada'
import {
  calzadoExcluyeCarterasPorDefecto,
  parseTipoGruposParam,
  rowMatchesTipoGrupos,
  sanitizeTipoGruposParaRamo,
  type RamoTipoBazzar,
  type TipoGrupoId,
} from '@/lib/filtros/filtro-tipo-canonico'

/** Catálogo: snapshot TTL 30s (filtros <1s) · force-dynamic mantiene searchParams vivos. */
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Heurística sin round-trip: candidatas PRENDAS 654 (ACTVITTA / caso). */
function esCandidataPrendas654(r: StockWebItem): boolean {
  const caso = String(r.stock_sano_caso ?? '').toUpperCase()
  const marca = String(r.marca ?? '').toUpperCase()
  return caso.includes('PRENDA') || marca.includes('ACTVITTA')
}

interface Props {
  searchParams: {
    marca?: string
    genero_id?: string
    grupo_estilo?: string
    linea?: string
    material?: string
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

/** Orden retail Calzados (mock Director) · resto alfabético. */
const MARCA_PREF_CALZADO = [
  'BEIRA RIO',
  'VIZZANO',
  'MODARE',
  'MOLECA',
  'MOLEKINHA',
  'MOLEKINHO',
  'ACTVITTA',
  'BR SPORT',
]

/** Orden retail Confecciones. */
const MARCA_PREF_CONFECCIONES = ['KYLY', 'MILON']

function sortMarcasRetail(marcas: string[], pref: string[]): string[] {
  const norm = (m: string) => m.trim().toUpperCase().replace(/\s+/g, ' ')
  const by = new Map(marcas.map((m) => [norm(m), m]))
  const head = pref.map((p) => by.get(p)).filter((m): m is string => !!m)
  const headSet = new Set(head.map(norm))
  const rest = marcas
    .filter((m) => !headSet.has(norm(m)))
    .sort((a, b) => a.localeCompare(b, 'es'))
  return [...head, ...rest]
}

function marcasPorProveedor(rows: StockWebItem[], proveedorId: number): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    if (Number(r.proveedor_importacion_id) !== proveedorId) continue
    const m = String(r.marca ?? '').trim()
    if (m) set.add(m)
  }
  return [...set]
}

export default async function CatalogoPage({ searchParams }: Props) {
  const t0 = Date.now()
  const { marca: marcaFiltro, grupo_estilo: estiloFiltro, colores: coloresFiltroRaw } =
    searchParams
  const generoFiltro = Number(searchParams.genero_id)
  const lineaFiltro = String(searchParams.linea ?? '').trim()
  const materialFiltro = String(searchParams.material ?? '').trim()
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

  const snap = await getCatalogoSnapshot()
  const allRows = snap.rows
  const tAfterSnap = Date.now()

  // Dimensiones base (ramo + tipo + Mario Bros) — universo de cascada
  let rowsBase = [...allRows]

  if (ramoFiltro === 'CALZADO') {
    rowsBase = rowsBase.filter((r) => Number(r.proveedor_importacion_id) === 654)
  } else if (ramoFiltro === 'CONFECCIONES') {
    rowsBase = rowsBase.filter((r) => Number(r.proveedor_importacion_id) === 638)
  }

  if (tipoFiltro.length) {
    rowsBase = rowsBase.filter((r) =>
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
    rowsBase = rowsBase.filter(
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

  if (qFiltro) {
    rowsBase = rowsBase.filter((r) => {
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

  const filtroMol = {
    marca: marcaFiltro,
    genero_id: Number.isFinite(generoFiltro) && generoFiltro > 0 ? generoFiltro : undefined,
    grupo_estilo: estiloFiltro,
    linea: lineaFiltro || undefined,
    material: materialFiltro || undefined,
    colores: coloresFiltro.length ? coloresFiltro : undefined,
  }

  // Facetas leave-one-out (replace, no universo) — 2.2.1.42
  const facetas = {
    generos: buildFacetasDesdeFilas(rowsForFacet(rowsBase, 'genero', filtroMol)).generos,
    estilos: buildFacetasDesdeFilas(rowsForFacet(rowsBase, 'estilo', filtroMol)).estilos,
    lineas: buildFacetasDesdeFilas(rowsForFacet(rowsBase, 'linea', filtroMol)).lineas,
    materiales: buildFacetasDesdeFilas(rowsForFacet(rowsBase, 'material', filtroMol))
      .materiales,
    colores: buildFacetasDesdeFilas(rowsForFacet(rowsBase, 'color', filtroMol)).colores,
  }

  // Árbol Calzados/Confecciones: marcas por proveedor desde stock vivo (654 / 638)
  const marcasCalzado = sortMarcasRetail(
    marcasPorProveedor(allRows, 654),
    MARCA_PREF_CALZADO,
  )
  const marcasConfecciones = sortMarcasRetail(
    marcasPorProveedor(allRows, 638),
    MARCA_PREF_CONFECCIONES,
  )

  let rowsFiltradas = rowsForFacet(rowsBase, null, filtroMol)
  const tAfterFilter = Date.now()

  const lineas638 = Array.from(
    new Set(
      rowsFiltradas
        .filter((r) => Number(r.proveedor_importacion_id) === 638)
        .map((r) => String(r.linea_codigo).trim())
        .filter(Boolean),
    ),
  )
  const lineas654Prendas = Array.from(
    new Set(
      rowsFiltradas
        .filter(
          (r) =>
            Number(r.proveedor_importacion_id) === 654 && esCandidataPrendas654(r),
        )
        .map((r) => String(r.linea_codigo).trim())
        .filter(Boolean),
    ),
  )
  const [ppd638, pePrendasIndex] = await Promise.all([
    lineas638.length > 0
      ? loadPpd638Enrich(lineas638)
      : Promise.resolve({ amTalles: new Map(), lpnPorTalle: new Map() }),
    lineas654Prendas.length > 0
      ? loadPePrendasAmTalleIndex(lineas654Prendas)
      : Promise.resolve(new Map<string, string[]>()),
  ])
  const tAfterEnrich = Date.now()

  const todos = agruparProductos(
    rowsFiltradas,
    ppd638.amTalles,
    ppd638.lpnPorTalle,
    pePrendasIndex,
  ).filter((p) => p.variantes.length > 0)
  const productos = sortProductosLRMC(todos)
  const tEnd = Date.now()

  console.info(
    '[catalogo-timing]',
    JSON.stringify({
      cacheHit: snap.cacheHit,
      rows: snap.rowCount,
      productos: productos.length,
      lineas638: lineas638.length,
      lineas654Pe: lineas654Prendas.length,
      snapshot_ms: snap.ms,
      filter_facet_ms: tAfterFilter - tAfterSnap,
      enrich_grada_ms: tAfterEnrich - tAfterFilter,
      agrupar_ms: tEnd - tAfterEnrich,
      total_ms: tEnd - t0,
      ramo: ramoFiltro || null,
      marca: marcaFiltro || null,
      estilo: estiloFiltro || null,
    }),
  )

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

  const filtros = (
    <Suspense>
      <FiltrosCatalogo
        marcasCalzado={marcasCalzado}
        marcasConfecciones={marcasConfecciones}
        generos={facetas.generos}
        estilos={facetas.estilos}
        lineas={facetas.lineas}
        materiales={facetas.materiales}
        colores={facetas.colores}
        totalModelos={productos.length}
        totalUnidades={totalUnidades}
        unidadLabel={unidadLabel}
      />
    </Suspense>
  )

  return (
    <CatalogoShell filters={filtros}>
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
    </CatalogoShell>
  )
}

/** Código proveedor numérico-aware (L·R·M·C) — 654 guiones · 638 L+C. */
function cmpCodigoProveedor(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  return String(a ?? '')
    .trim()
    .localeCompare(String(b ?? '').trim(), 'es', { numeric: true, sensitivity: 'base' })
}

function colorCodigoVariante(v: Variante): string | number | null | undefined {
  return v.imagen_item.color_code ?? v.imagen_item.ppd_color_codigo ?? v.id_color_f9
}

/** Grilla catálogo: menor → mayor por L + R + M + C (ambos proveedores). */
function sortProductosLRMC(productos: ProductoAgrupado[]): ProductoAgrupado[] {
  for (const p of productos) {
    p.variantes.sort((a, b) =>
      cmpCodigoProveedor(colorCodigoVariante(a), colorCodigoVariante(b)),
    )
  }
  return [...productos].sort((a, b) => {
    let c = cmpCodigoProveedor(a.linea_codigo, b.linea_codigo)
    if (c) return c
    c = cmpCodigoProveedor(a.referencia_codigo, b.referencia_codigo)
    if (c) return c
    const ma = a.variantes[0]?.imagen_item.material_code
    const mb = b.variantes[0]?.imagen_item.material_code
    c = cmpCodigoProveedor(ma, mb)
    if (c) return c
    return cmpCodigoProveedor(
      colorCodigoVariante(a.variantes[0]!),
      colorCodigoVariante(b.variantes[0]!),
    )
  })
}

/* ─── Agrupación: linea + referencia + material → variantes de color ─── */
function agruparProductos(
  items: StockWebItem[],
  ppdIndex: Map<string, string[]>,
  lpnPorTalle: PpdLpnPorTalleIndex,
  pePrendasIndex: Map<string, string[]>,
): ProductoAgrupado[] {
  const prodMap = new Map<string, ProductoAgrupado>()
  const varMap = new Map<string, Map<number, Variante>>()
  /** markup % por producto (primer fila ALM) */
  const markupByProd = new Map<string, number | null>()

  for (const item of items) {
    const prodKey = `${item.linea_id}-${item.referencia_id}-${item.material_id}`

    if (!prodMap.has(prodKey)) {
      const es638 = Number(item.proveedor_importacion_id) === 638
      const esPrenda654 =
        !es638 &&
        esPrendasPe(pePrendasIndex, item.linea_codigo, item.referencia_codigo)
      const markup =
        item.stock_sano_markup_pct != null ? Number(item.stock_sano_markup_pct) : null
      markupByProd.set(prodKey, Number.isFinite(markup as number) ? markup : null)
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
      // Paridad RIMEC Web agruparTarjetasCatalogo → enrichImagenUrls(imagenNombre: imagen_url)
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
          // Obligatorio: sin esto el carrito regenera stem 638 por color_code (ej. 400031)
          // y pierde la URL canónica de Storage (ej. 1000031_0001.jpg) — error 4.05.05.001
          imagen_url: item.imagen_url,
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
        precio_web: item.precio_web != null ? Number(item.precio_web) : null,
      })
    } else {
      /* Conservar precio si llega otra fila misma combinación */
      const t = variante.tallas.find((x) => x.combinacion_id === item.combinacion_id)
      if (t && (t.precio_web == null || t.precio_web <= 0) && item.precio_web != null) {
        t.precio_web = Number(item.precio_web)
      }
    }
  }

  return Array.from(prodMap.values()).map((p) => {
    p.variantes = Array.from(varMap.get(p.key)!.values())
    const es638 = Number(p.proveedor_importacion_id) === 638
    const esPrenda654 = p.unidad_stock === 'prendas' && !es638
    const markup = markupByProd.get(p.key) ?? null
    p.variantes.forEach((v) => {
      if (es638) {
        const colorRaw = v.imagen_item.color_code ?? v.imagen_item.ppd_color_codigo
        const colorStr = colorRaw != null ? String(colorRaw) : null
        const am = resolveAmTallesForProducto(
          ppdIndex,
          p.linea_codigo,
          p.referencia_codigo,
          colorStr,
        )
        v.tallas = remapTallas638DesdePpd(v.tallas, am)
        v.tallas = aplicarPreciosPpdATallas638(
          v.tallas,
          lpnPorTalle,
          p.linea_codigo,
          p.referencia_codigo,
          colorStr,
          markup,
        )
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
    // Cabecera: mínimo precio entre tallas (rango lo arma ProductoCard)
    if (es638) {
      const precios = p.variantes
        .flatMap((v) => v.tallas.map((t) => Number(t.precio_web) || 0))
        .filter((n) => n > 0)
      if (precios.length) p.precio_web = Math.min(...precios)
    }
    return p
  })
}
