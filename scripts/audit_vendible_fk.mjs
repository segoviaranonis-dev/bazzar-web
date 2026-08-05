import pg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadDatabaseUrl() {
  const candidates = [
    resolve(root, '.env.local'),
    resolve(root, '..', 'report', '.env.local'),
  ]
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq > 0 && t.slice(0, eq).trim() === 'DATABASE_URL') {
        return t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      }
    }
  }
  throw new Error('DATABASE_URL no encontrada')
}

const pool = new pg.Pool({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false } })

const vend = await pool.query(`
  SELECT COUNT(DISTINCT (linea_codigo, referencia_codigo, material_id))::int AS modelos,
         COUNT(*)::int AS filas, COALESCE(SUM(stock_web),0)::int AS pares
  FROM v_stock_web
  WHERE stock_web > 0 AND precio_web > 0 AND stock_sano_estado = 'SANO'
`)
console.log('Vendible SANO:', vend.rows[0])

const fk = await pool.query(`
  SELECT COUNT(*) FILTER (WHERE id_material_f9 IS NULL)::int AS sin_mat,
         COUNT(*) FILTER (WHERE id_color_f9 IS NULL)::int AS sin_col,
         COUNT(*)::int AS total
  FROM v_stock_web WHERE stock_sano_estado = 'SANO' AND stock_web > 0
`)
console.log('FK PPD:', fk.rows[0])

const pe = await pool.query(`
  SELECT linea_codigo, referencia_codigo, material_code, id_material_f9, id_color_f9, marca
  FROM v_stock_web
  WHERE stock_sano_estado = 'SANO' AND (id_material_f9 IS NULL OR id_color_f9 IS NULL)
  LIMIT 8
`)
console.log('Muestra sin FK:', pe.rows)

await pool.end()
