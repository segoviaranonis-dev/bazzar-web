export type DimRow = {
  clave: string
  deposito_modelos: number
  deposito_pares: number
  sano_modelos: number
  sano_pares: number
  web_modelos: number
  web_pares: number
  delta_modelos: number
  delta_pares: number
  ok: boolean
}

export type Hueco = {
  linea: string
  referencia: string
  material: string
  marca: string
  estilo: string
  tipo_v2: string
  deposito_pares: number
  sano_pares: number | null
  web_pares: number | null
  problema: 'sin_web' | 'sin_sano' | 'solo_deposito' | 'pares_diff'
}

export type TallaStock = {
  /** Etiqueta mostrada: 638 = am_talle (P/1/4…); 654 = talla calzado */
  talla: string
  talla_orden: number
  stock_web: number
  stock_dep: number
  precio_web: number | null
  /** 638: notación Carlos `1(1)1` · `P(1)P` — null si no hay */
  grada_carlos?: string | null
  /** false = no usar como talle ropa (pilar 654 mezclado) */
  es_grada_638_valida?: boolean
}

export type ColorBloque = {
  color_code: string
  color_nombre: string
  tallas: TallaStock[]
  pares_web: number
}

/** Unidad de auditoría molecular */
export type ModeloDetalle = {
  key: string
  linea: string
  linea_desc: string | null
  referencia: string
  referencia_desc: string | null
  material: string
  material_desc: string | null
  color_code: string | null
  color_nombre: string | null
  estilo: string
  tipo_v2: 'Calzado' | 'Confecciones'
  proveedor_id: number
  es_medias_o_ropa_654: boolean
  en_dep: boolean
  en_sano: boolean
  en_web: boolean
  dep_pares: number
  sano_pares: number | null
  web_pares: number
  /** Cruce Dep/Sano/Web de este modelo */
  ok_stock: boolean
  /** 638: talles con am_talle canónico */
  ok_grada: boolean
  ok: boolean
  /** 654: variantes color → tallas */
  colores: ColorBloque[]
  /** 638: talles grada abierta (am_talle) × prenda */
  tallas: TallaStock[]
  /** 638: stock sin am_talle (cuantitativo sí; grada no) */
  stock_sin_grada_638?: { web: number; dep: number }
}

export type MarcaBloque = {
  marca: string
  modelos: number
  pares_web: number
  pares_dep: number
  /** Cruce cuantitativo Dep≈Web */
  ok_stock: boolean
  /** 638: hay am_talle canónico en todos los modelos con stock */
  ok_grada: boolean
  ok: boolean
  tiene_medias_ropa: boolean
  /** Unión de tallas de la marca (654 curva · 638 am_talle), menor → mayor */
  grada: { talla: string; talla_orden: number }[]
  modelos_detalle: ModeloDetalle[]
}

export type RamoBloque = {
  tipo_v2: 'Calzado' | 'Confecciones'
  proveedor_id: number
  modelos: number
  pares_web: number
  pares_dep: number
  ok_stock: boolean
  ok_grada: boolean
  ok: boolean
  /** Aviso único de ramo (no repetir en cada tarjeta) */
  alerta_grada?: string | null
  marcas: MarcaBloque[]
}

export type AuditoriaLocalPayload = {
  /** PASS total = stock + grada 638 */
  ok: boolean
  ok_stock: boolean
  ok_grada_638: boolean
  generado_en: string
  nota: string
  totales: {
    deposito_modelos: number
    deposito_pares: number
    sano_modelos: number
    sano_pares: number
    web_modelos: number
    web_pares: number
  }
  por_tipo_v2: DimRow[]
  por_marca: DimRow[]
  por_estilo: DimRow[]
  huecos: Hueco[]
  /** Detalle senior: ramo → marca → modelo → grada/talles */
  ramos: RamoBloque[]
}
