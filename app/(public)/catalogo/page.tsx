import { createClient } from '@/lib/supabase/server'
import type { CombinacionCatalogo } from '@/types/bazzar'

export const revalidate = 60

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: productos } = await supabase
    .from('v_catalogo_web')
    .select('*')
    .gt('stock_web', 0)
    .order('referencia_codigo')

  const agrupados = agrupar(productos ?? [])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo</h1>
      <p className="text-gray-500 mb-8">{agrupados.length} productos disponibles</p>
      {agrupados.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🛍️</p>
          <p>Próximamente nuevos productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {agrupados.map(p => <ProductoCard key={p.key} producto={p} />)}
        </div>
      )}
    </div>
  )
}

function buildImageUrl(item: CombinacionCatalogo): string | null {
  if (!item.imagen_bucket || !item.imagen_formula) return null
  return item.imagen_bucket + '/' + item.imagen_formula
    .replace('{linea}', item.linea_codigo)
    .replace('{referencia}', item.referencia_codigo)
    .replace('{material}', item.material_codigo)
    .replace('{color}', item.color_codigo)
}

interface Agrupado {
  key: string
  referencia_codigo: string
  referencia_descripcion: string | null
  linea_descripcion: string | null
  color_nombre: string
  hex_web: string | null
  precio_web: number | null
  imagen_url: string | null
  tallas: string[]
}

function agrupar(items: CombinacionCatalogo[]): Agrupado[] {
  const mapa = new Map<string, Agrupado>()
  for (const item of items) {
    const key = `${item.referencia_codigo}-${item.color_codigo}`
    if (!mapa.has(key)) {
      mapa.set(key, {
        key,
        referencia_codigo: item.referencia_codigo,
        referencia_descripcion: item.referencia_descripcion,
        linea_descripcion: item.linea_descripcion,
        color_nombre: item.color_nombre,
        hex_web: item.hex_web,
        precio_web: item.precio_web,
        imagen_url: buildImageUrl(item),
        tallas: [],
      })
    }
    mapa.get(key)!.tallas.push(item.talla_codigo)
  }
  return Array.from(mapa.values())
}

function ProductoCard({ producto }: { producto: Agrupado }) {
  const precio = producto.precio_web
    ? new Intl.NumberFormat('es-PY').format(producto.precio_web)
    : null
  return (
    <div className="card group cursor-pointer hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {producto.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagen_url} alt={producto.referencia_descripcion ?? producto.referencia_codigo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">👟</div>
        )}
        {producto.hex_web && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: producto.hex_web }} title={producto.color_nombre} />
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{producto.linea_descripcion ?? ''}</p>
        <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">
          {producto.referencia_descripcion ?? producto.referencia_codigo}
        </p>
        <p className="text-xs text-gray-500 mt-1">{producto.color_nombre}</p>
        <div className="flex items-center justify-between mt-2">
          {precio
            ? <p className="font-bold text-amber-600">Gs. {precio}</p>
            : <p className="text-gray-400 text-sm">Consultar</p>}
          <p className="text-xs text-gray-400">{producto.tallas.length} talles</p>
        </div>
      </div>
    </div>
  )
}
