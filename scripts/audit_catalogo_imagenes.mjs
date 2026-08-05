/**
 * Cobertura imágenes catálogo Bazzar Web — v_stock_web + bucket productos.
 * Uso: node scripts/audit_catalogo_imagenes.mjs
 */
import pg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { productImageUrlFromCodes } from '../lib/product-image.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq > 0) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const { rows } = await pool.query(`
  SELECT DISTINCT ON (linea_codigo, referencia_codigo, material_code, color_code, id_material_f9, id_color_f9)
    linea_codigo, referencia_codigo, material_code, color_code,
    id_material_f9, id_color_f9, marca, stock_sano_estado
  FROM v_stock_web
  WHERE stock_web > 0 AND precio_web > 0 AND stock_sano_estado = 'SANO'
  ORDER BY linea_codigo, referencia_codigo, material_code, color_code, id_material_f9, id_color_f9
`)

let ok = 0
let fail = 0
const missingFk = { mat: 0, col: 0 }

for (const r of rows) {
  const mat = r.material_code ?? r.id_material_f9
  const col = r.color_code ?? r.id_color_f9
  if (!mat) missingFk.mat++
  if (!col) missingFk.col++
  const url = productImageUrlFromCodes(r.linea_codigo, r.referencia_codigo, mat, col)
  if (!url) { fail++; continue }
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (res.ok) ok++
    else fail++
  } catch {
    fail++
  }
}

console.log('Variantes color SANO:', rows.length)
console.log('Imagen HEAD ok:', ok, 'fail:', fail)
console.log('FK faltante material:', missingFk.mat, 'color:', missingFk.col)

const estados = await pool.query(`
  SELECT stock_sano_estado, COUNT(*)::int n, SUM(stock_web)::int pares
  FROM v_stock_web WHERE stock_web > 0 GROUP BY 1
`)
console.log('Stock por estado:', estados.rows)

await pool.end()
