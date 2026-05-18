/**
 * Normalización de colores técnicos del catálogo → colores base para el usuario.
 * Ej: "BLANCO99", "BLANCO/DORADO", "BLANCO OFF 1164" → "Blanco"
 */

const COLOR_BASE: [string, string][] = [
  ['BLANCO',    'Blanco'],
  ['NEGRO',     'Negro'],
  ['BEIGE',     'Beige'],
  ['NUDE',      'Nude'],
  ['CAMEL',     'Camel'],
  ['MARRON',    'Marrón'],
  ['CAFE',      'Café'],
  ['COGNAC',    'Cognac'],
  ['ROSA',      'Rosa'],
  ['ROSADO',    'Rosado'],
  ['CORAL',     'Coral'],
  ['ROJO',      'Rojo'],
  ['BORDO',     'Bordó'],
  ['VINO',      'Vino'],
  ['FUCSIA',    'Fucsia'],
  ['NARANJA',   'Naranja'],
  ['AMARILLO',  'Amarillo'],
  ['DORADO',    'Dorado'],
  ['PLATEADO',  'Plateado'],
  ['PLATA',     'Plateado'],
  ['GRIS',      'Gris'],
  ['AZUL',      'Azul'],
  ['MARINO',    'Marino'],
  ['CELESTE',   'Celeste'],
  ['VERDE',     'Verde'],
  ['KAKI',      'Kaki'],
  ['LILA',      'Lila'],
  ['VIOLETA',   'Violeta'],
  ['MULTICOLOR','Multicolor'],
]

/**
 * Devuelve el color base normalizado para mostrar al usuario.
 * Si no hay coincidencia retorna el original con primer carácter en mayúscula.
 */
export function normalizeColor(raw: string): string {
  const up = raw.toUpperCase().trim()
  for (const [key, display] of COLOR_BASE) {
    if (up === key || up.startsWith(key + '/') || up.startsWith(key + ' ') || up.includes(key)) {
      return display
    }
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

/**
 * Construye la lista de colores base únicos a partir de un array de colores técnicos.
 * Preserva el orden de primera aparición.
 */
export function buildColorOptions(rawColors: string[]): { base: string; variants: string[] }[] {
  const map = new Map<string, string[]>()
  for (const c of rawColors) {
    const base = normalizeColor(c)
    const arr = map.get(base) ?? []
    if (!arr.includes(c)) arr.push(c)
    map.set(base, arr)
  }
  return Array.from(map.entries())
    .map(([base, variants]) => ({ base, variants }))
    .sort((a, b) => a.base.localeCompare(b.base))
}

/**
 * Dado un color base normalizado, retorna los patrones SQL LIKE para buscar
 * todas sus variantes técnicas (para usar con Supabase .ilike / .or).
 * Ej: "Blanco" → "%BLANCO%"
 */
export function colorToLikePattern(base: string): string {
  const entry = COLOR_BASE.find(([, display]) => display === base)
  return entry ? `%${entry[0]}%` : `%${base.toUpperCase()}%`
}
