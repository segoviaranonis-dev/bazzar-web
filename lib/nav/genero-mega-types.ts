/** Tipos mega por género — client-safe. */
export type GeneroMegaFacet = {
  genero_id: number
  genero_label: string
  /** Lista vertical de marcas (orden preferente ACTVITTA / BR SPORT) */
  marcas: string[]
  /** Estilos de todo el género (fallback) */
  estilos: { nombre: string }[]
  /** Estilos por marca → panel medio al elegir marca */
  estilosPorMarca: Record<string, string[]>
  portada: {
    marca: 'BR SPORT'
    href: string
    candidates: string[]
    objectPosition: string
    ctaLabel: string
  }
}
