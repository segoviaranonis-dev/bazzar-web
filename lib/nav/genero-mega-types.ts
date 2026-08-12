/** Tipos mega por género — client-safe. */
export type GeneroMegaPortada = {
  /** Marcas de portada (carousel) · BR SPORT solo Caballeros */
  marcas: string[]
  href: string
  candidates: string[]
  objectPosition: string
  ctaLabel: string
}

export type GeneroMegaFacet = {
  genero_id: number
  genero_label: string
  marcas: string[]
  estilos: { nombre: string }[]
  estilosPorMarca: Record<string, string[]>
  portada: GeneroMegaPortada
}
