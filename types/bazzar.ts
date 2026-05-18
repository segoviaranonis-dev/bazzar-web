// Tipos del dominio Bazzar

// ── v_stock_web ─────────────────────────────────────────────────────────────
// Vista alineada al estándar global (migración 018):
//   linea_id / referencia_id (bigint), linea_codigo / referencia_codigo (text),
//   grupo_estilo_id + descp_grupo_estilo,
//   genero_id + descp_genero.
// Imagen: {SUPABASE_URL}/storage/v1/object/public/productos/{linea_codigo}-{referencia_codigo}-{material_code}-{color_code}.jpg

export interface StockWebItem {
  combinacion_id: number
  marca: string
  linea_id: number
  linea_codigo: string
  linea_descripcion: string
  referencia_id: number
  referencia_codigo: string
  referencia_descripcion: string
  material_id: number
  material_code?: string
  material_descripcion: string
  color_id: number
  color_code?: string
  color_nombre: string
  hex_web: string | null
  id_material_f9: number
  id_color_f9: number
  talla_codigo: string
  talla_orden: number
  stock_web: number
  precio_web: number | null
  grupo_estilo_id: number | null
  descp_grupo_estilo: string
  genero_id: number | null
  descp_genero: string
  imagen_url: string | null
}

// ── v_catalogo_web (legacy — mantener por compatibilidad) ───────────────────
export interface CombinacionCatalogo {
  combinacion_id: number
  proveedor_id: number
  proveedor_nombre: string
  marca_nombre: string | null
  imagen_bucket: string | null
  imagen_formula: string | null
  linea_id: number
  linea_codigo: string
  linea_descripcion: string | null
  referencia_id: number
  referencia_codigo: string
  referencia_descripcion: string | null
  material_codigo: string
  material_descripcion: string | null
  color_codigo: string
  color_nombre: string
  hex_web: string | null
  talla_codigo: string
  talla_tipo: 'NUMERICO' | 'FRACCIONARIO' | 'TEXTUAL'
  talla_orden: number
  precio_web: number | null
  lista_id: number | null
  stock_web: number
}

// ── Carrito ─────────────────────────────────────────────────────────────────
export interface ItemCarrito {
  combinacion_id: number
  linea_id: number
  referencia_id: number
  referencia_codigo: string
  referencia_descripcion: string | null
  color_nombre: string
  talla_codigo: string
  precio_unitario: number
  cantidad: number
  imagen_url: string | null
}

export interface DatosPedido {
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  cliente_direccion: string
  notas_cliente?: string
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'ENTREGADO'

export interface PedidoWeb {
  id: number
  created_at: string
  estado: EstadoPedido
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string | null
  total: number
  simulacion_pago_enviada: boolean
}
