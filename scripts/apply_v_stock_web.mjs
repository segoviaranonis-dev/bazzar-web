/**
 * Aplica supabase/v_stock_web.sql (Stock Sano) contra DATABASE_URL.
 * Requiere migración 115_stock_sano_protocolo.sql ya aplicada.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadDatabaseUrl() {
  const candidates = [
    path.join(root, '..', 'report', '.env.local'),
    path.join(root, '.env.local'),
  ]
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue
    const env = fs.readFileSync(envPath, 'utf8')
    const m = env.match(/^DATABASE_URL=(.+)$/m)
    const url = m?.[1]?.trim().replace(/^["']|["']$/g, '')
    if (url) return url
  }
  console.error('DATABASE_URL no encontrada (.env.local o ../report/.env.local)')
  process.exit(1)
}

async function main() {
  const sql = fs.readFileSync(path.join(root, 'supabase', 'v_stock_web.sql'), 'utf8')
  const client = new pg.Client({
    connectionString: loadDatabaseUrl(),
    ssl: loadDatabaseUrl().includes('localhost') ? false : { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    await client.query(sql)
    const check = await client.query(`
      SELECT
        COUNT(*)::int AS skus,
        SUM(stock_web)::int AS pares,
        COUNT(*) FILTER (WHERE precio_web IS NOT NULL AND precio_web > 0)::int AS con_precio,
        COUNT(*) FILTER (WHERE stock_sano_estado = 'SANO')::int AS sano
      FROM v_stock_web
    `)
    console.log('v_stock_web aplicada OK:', check.rows[0])
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
