/** Tipos mega Rebajas — client-safe (sin pg). */
export type RebajasMegaFacet = {
  generos: { id: number; nombre: string }[]
  marcas: string[]
  estilos: { nombre: string }[]
  portada: {
    marca: 'BR SPORT'
    href: string
    candidates: string[]
    objectPosition: string
    ctaLabel: string
  }
}
