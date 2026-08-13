/**
 * Pool pg único para enrich de catálogo (estilo PE · PPD 638 · PRENDAS).
 * Evita connect/teardown por request (latencia dominante en filtros).
 */
import pg from 'pg'

let pool: pg.Pool | null = null

export function getCatalogoPgPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()
  if (!url) return null
  if (!pool) {
    pool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    })
    pool.on('error', (err) => {
      console.error('[catalogo-pg-pool]', err.message)
    })
  }
  return pool
}
