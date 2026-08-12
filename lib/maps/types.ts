export type PuntoEntrega = {
  lat: number
  lng: number
  direccion: string
  /** Texto display Nominatim / Maps */
  label?: string
  /** Prep mañana: catálogo D/C/D */
  departamento?: string | null
  ciudad?: string | null
  distrito?: string | null
}

export type SugerenciaDireccion = {
  id: string
  label: string
  lat: number
  lng: number
  direccion: string
  departamento?: string | null
  ciudad?: string | null
  distrito?: string | null
}
