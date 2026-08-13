/**
 * Pool pg único para enrich de catálogo (estilo PE · PPD 638 · PRENDAS).
 * Evita connect/teardown por request (latencia dominante en filtros).
 *
 * Nota: tipos locales de `pg` solo exponen Client; Pool existe en runtime.
 */
import pg from 'pg'

type Queryable = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>
  on: (event: 'error', cb: (err: Error) => void) => void
}

const PoolCtor = (pg as unknown as { Pool: new (cfg: object) => Queryable }).Pool

let pool: Queryable | null = null

export function getCatalogoPgPool(): Queryable | null {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()
  if (!url) return null
  if (!pool) {
    pool = new PoolCtor({
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
