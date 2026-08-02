/**
 * Flag medias/ropas dentro de 654 — paridad rimec-web pe-modulo-medias (lectura).
 * No cambia semántica de venta; solo marca en auditoría.
 */

const LINEAS_MEDIAS = new Set([
  '2199', '2598', '2599', '2799', '2899', '4998', '4999', '5999', '7499',
])

function norm(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

export function esMediasORopa654(input: {
  proveedor_id?: number | null
  marca?: string | null
  tipo_1?: string | null
  descp_tipo_1?: string | null
  linea?: string | null
  material_desc?: string | null
}): boolean {
  if (Number(input.proveedor_id) !== 654) return false
  if (norm(input.tipo_1) === 'MEDIAS' || norm(input.descp_tipo_1) === 'MEDIAS') return true
  if (/\bMEDIAS?\b/.test(norm(input.marca))) return true
  if (/\bROPA/.test(norm(input.marca)) || /\bACT\s*ROPAS?\b/.test(norm(input.marca))) return true
  if (/\bMEDIA/.test(norm(input.material_desc))) return true
  const linea = String(input.linea ?? '').trim()
  return Boolean(linea && LINEAS_MEDIAS.has(linea))
}
