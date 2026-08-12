/**
 * Imagen de portada (marca) — mismo Storage holding que producto.
 * Prefijo: productos/portada/{tier?}/{stem}.jpg
 * Keyword: **imagen de portada** · CHUSAR 2.01.04.024 / 2.5.1.24
 */

export type PortadaTier = 'flat' | 'sm' | 'md' | 'lg'

/** slug Storage ↔ nombre comercial catálogo */
export const PORTADA_STEM_BY_MARCA: Record<string, string> = {
  VIZZANO: 'vizzano',
  'BEIRA RIO': 'beira-rio',
  BEIRA_RIO: 'beira-rio',
  MODARE: 'modare',
  MOLECA: 'moleca',
  MOLEKINHA: 'molekinha',
  MOLEKINHO: 'molekinho',
  ACTVITTA: 'actvitta',
  'BR SPORT': 'br-sport',
  BR_SPORT: 'br-sport',
  KYLY: 'kyly',
  MILON: 'milon',
}

/**
 * Orden Director 2026-08-07 — grilla inicio.
 * 1.x mujer premium · 2.x Moleca family + Actvitta · 3.x sport/confecciones
 * Kyly + Milon: portadas 2026-08-11 (WeTransfer jpg → Storage).
 */
export type MarcaPortadaDef = {
  code: string
  nombre: string
  desc: string
  href: string
  /** false = reserva visual; no pedir Storage hasta que llegue el archivo */
  portadaLista: boolean
  /**
   * Ancla del recorte 4:5 (banners ~2.8:1). Sin esto, cover+centro
   * deja fuera a la modelo cuando está en un extremo (Modare, Molekinha, BR Sport).
   */
  objectPosition?: string
}

export const MARCAS_INICIO_FILAS: MarcaPortadaDef[][] = [
  [
    {
      code: '1.1',
      nombre: 'VIZZANO',
      desc: 'Elegancia italiana',
      href: '/catalogo?marca=VIZZANO',
      portadaLista: true,
      objectPosition: '55% 38%',
    },
    {
      code: '1.2',
      nombre: 'BEIRA RIO',
      desc: 'Estilo en cada paso',
      href: '/catalogo?marca=BEIRA+RIO',
      portadaLista: true,
      /** ~34%: izquierda vacía · modelo · logo a la derecha */
      objectPosition: '34% center',
    },
    {
      code: '1.3',
      nombre: 'MODARE',
      desc: 'Sofisticación atemporal',
      href: '/catalogo?marca=MODARE',
      portadaLista: true,
      /** Modelo a la derecha; Y bajo corta la cara */
      objectPosition: '90% 18%',
    },
  ],
  [
    {
      code: '2.1',
      nombre: 'MOLECA',
      desc: 'Moda y actitud',
      href: '/catalogo?marca=MOLECA',
      portadaLista: true,
      /** Modelo ~40%; derecha = logo amarillo */
      objectPosition: '40% 30%',
    },
    {
      code: '2.2',
      nombre: 'MOLEKINHA',
      desc: 'Mini fashionista',
      href: '/catalogo?marca=MOLEKINHA',
      portadaLista: true,
      /** Niña a la derecha; centro = logo + puff vacío */
      objectPosition: '92% 26%',
    },
    {
      code: '2.3',
      nombre: 'MOLEKINHO',
      desc: 'Aventura sin límites',
      href: '/catalogo?marca=MOLEKINHO',
      portadaLista: true,
      /** Niño ~45–55%; 75%+ = solo ilustración + logo */
      objectPosition: '48% center',
    },
    {
      code: '2.4',
      nombre: 'ACTVITTA',
      desc: 'Movimiento activo',
      href: '/catalogo?marca=ACTVITTA',
      portadaLista: true,
      objectPosition: '62% 35%',
    },
  ],
  [
    {
      code: '3.1',
      nombre: 'BR SPORT',
      desc: 'Performance urbana',
      href: '/catalogo?marca=BR+SPORT',
      portadaLista: true,
      /** Portada nueva 2026-08-07 · foto cuadrada con modelo al centro */
      objectPosition: 'center center',
    },
    {
      code: '3.2',
      nombre: 'KYLY',
      desc: 'Confecciones infantiles',
      href: '/catalogo?marca=KYLY',
      portadaLista: true,
      /** Banner split: logo izq · niños der → grilla 4:5 ancla a la foto */
      objectPosition: '78% center',
    },
    {
      code: '3.3',
      nombre: 'MILON',
      desc: 'Confecciones infantiles',
      href: '/catalogo?marca=MILON',
      portadaLista: true,
      /** Banner split: logo izq · niñas der → grilla 4:5 ancla a la foto */
      objectPosition: '78% center',
    },
  ],
]

/** Ancla object-position canónica por marca (inicio + mega). */
export function objectPositionPortada(marca: string): string {
  const key = marca.trim().toUpperCase().replace(/\+/g, ' ').replace(/\s+/g, ' ')
  for (const fila of MARCAS_INICIO_FILAS) {
    const hit = fila.find((m) => m.nombre === key)
    if (hit?.objectPosition) return hit.objectPosition
  }
  return 'center center'
}

/**
 * Mega vertical recorta más en X — anclas para ver niñas/niños (no logo/puff).
 * Molekinha: niña der · Molekinho: niño centro · Kyly/Milon: foto der del split.
 */
export function objectPositionPortadaMega(marca: string): string {
  const key = marca.trim().toUpperCase().replace(/\+/g, ' ').replace(/\s+/g, ' ')
  const mega: Record<string, string> = {
    MOLEKINHA: '94% 22%',
    MOLEKINHO: '46% 40%',
    KYLY: '84% 32%',
    MILON: '84% 32%',
  }
  return mega[key] ?? objectPositionPortada(key)
}

const HOLDING_SUPABASE = 'https://extrlcvcgypwazxipvqm.supabase.co'

function resolveSupabaseUrl(raw: string | undefined): string | null {
  const value = (raw ?? '')
    .replace(/^NEXT_PUBLIC_SUPABASE_URL=/i, '')
    .trim()
    .replace(/\/$/, '')
  return value || HOLDING_SUPABASE
}

export function portadaStemFromMarca(marca: string): string | null {
  const key = marca.trim().toUpperCase().replace(/\+/g, ' ').replace(/\s+/g, ' ')
  if (PORTADA_STEM_BY_MARCA[key]) return PORTADA_STEM_BY_MARCA[key]
  const compact = key.replace(/\s+/g, '_')
  if (PORTADA_STEM_BY_MARCA[compact]) return PORTADA_STEM_BY_MARCA[compact]
  const slug = key.toLowerCase().replace(/\s+/g, '-')
  return slug || null
}

export function imagenPortadaUrl(
  marcaOrStem: string,
  tier: PortadaTier = 'md',
): string | null {
  const base = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!base) return null
  const stem =
    PORTADA_STEM_BY_MARCA[marcaOrStem.trim().toUpperCase()] ??
    portadaStemFromMarca(marcaOrStem) ??
    marcaOrStem.trim().toLowerCase()
  if (!stem) return null
  if (tier === 'flat') {
    return `${base}/storage/v1/object/public/productos/portada/${stem}.jpg`
  }
  return `${base}/storage/v1/object/public/productos/portada/${tier}/${stem}.jpg`
}

export function imagenPortadaCandidates(
  marca: string,
  preferred: PortadaTier = 'lg',
): string[] {
  const order: PortadaTier[] =
    preferred === 'sm'
      ? ['sm', 'md', 'lg', 'flat']
      : preferred === 'md'
        ? ['md', 'lg', 'flat', 'sm']
        : preferred === 'flat'
          ? ['flat', 'lg', 'md', 'sm']
          : ['lg', 'md', 'flat', 'sm']
  const out: string[] = []
  for (const t of order) {
    const u = imagenPortadaUrl(marca, t)
    if (u) out.push(u)
  }
  return out
}
