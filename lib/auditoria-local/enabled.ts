/**
 * Auditoría stock — SOLO versión local (:3002).
 * Prohibido en Vercel production. No es módulo de grada ni Report.
 */
export function isAuditoriaLocalEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false
  if (process.env.NEXT_PUBLIC_AUDITORIA_LOCAL === '0') return false
  if (process.env.NEXT_PUBLIC_AUDITORIA_LOCAL === '1') return true
  return process.env.NODE_ENV === 'development'
}
