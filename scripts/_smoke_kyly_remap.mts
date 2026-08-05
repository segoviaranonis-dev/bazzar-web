/**
 * Smoke: Kyly 107600 remapea 34–39 → am_talle PPD
 */
import {
  loadPpdAmTalleIndex,
  remapTallas638DesdePpd,
  resolveAmTallesForProducto,
} from '../lib/catalogo/enrich-grada-638'
import fs from 'fs'

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (!m) continue
  let v = m[2].trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1)
  if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v
}

const idx = await loadPpdAmTalleIndex(['107600', '107638'])
const am = resolveAmTallesForProducto(idx, '107600', '11', null)
console.log('am_talle PPD', am)
const fakeAlm = [
  { combinacion_id: 1, codigo: '34', orden: 1, stock: 1 },
  { combinacion_id: 2, codigo: '35', orden: 2, stock: 1 },
  { combinacion_id: 3, codigo: '36', orden: 3, stock: 2 },
  { combinacion_id: 4, codigo: '37', orden: 4, stock: 2 },
  { combinacion_id: 5, codigo: '38', orden: 5, stock: 1 },
  { combinacion_id: 6, codigo: '39', orden: 6, stock: 1 },
]
const remapped = remapTallas638DesdePpd(fakeAlm, am)
console.log(
  'remap',
  remapped.map((t) => `${t.codigo}:${t.stock}`).join(' · '),
)
const sum = remapped.reduce((s, t) => s + t.stock, 0)
console.log('Σ', sum, 'expect 8', sum === 8 ? 'OK' : 'FAIL')
const hasShoe = remapped.some((t) => Number(t.codigo) >= 33)
console.log('sin 34-39', !hasShoe ? 'OK' : 'FAIL')
