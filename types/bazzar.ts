// Tipos del dominio Bazzar — reflejan v_catalogo_web

export interface CombinacionCatalogo {
  combinacion_id: number
  proveedor_id: number
  proveedor_nombre: string
  imagen_bucket: string | null
  imagen_formula: string | null
  linea_codigo: string
  linea_descripcion: string | null
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

export interface ItemCarrito {
  combinacion_id: number
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
