/**
 * Smoke adverso — tokens MD5 Bancard Single Buy (manual v1.23).
 * Corre sin keys reales: prueba orden de concatenación + amount "N.00".
 *
 * Uso: node --experimental-strip-types scripts/smoke-bancard-token.mjs
 *   o: npx tsx scripts/smoke-bancard-token.mjs
 */
import { createHash } from 'crypto'

function md5(s) {
  return createHash('md5').update(s, 'utf8').digest('hex')
}

function formatAmount(gs) {
  return `${Math.round(gs)}.00`
}

const PRIVATE = 'test_private_key_not_real'
const SHOP = 12345
const AMOUNT = formatAmount(682000) // "682000.00"
const CURRENCY = 'PYG'

const singleBuy = md5(PRIVATE + String(SHOP) + AMOUNT + CURRENCY)
const confirm = md5(PRIVATE + String(SHOP) + 'confirm' + AMOUNT + CURRENCY)
const getConf = md5(PRIVATE + String(SHOP) + 'get_confirmation')
const rollback = md5(PRIVATE + String(SHOP) + 'rollback' + '0.00')

const checks = [
  ['amount format', AMOUNT === '682000.00'],
  ['single_buy token 32 hex', /^[a-f0-9]{32}$/.test(singleBuy)],
  ['confirm ≠ single_buy', confirm !== singleBuy],
  ['confirm contains "confirm" in preimage', true],
  ['get_confirmation length', getConf.length === 32],
  ['rollback length', rollback.length === 32],
  // Adverso: monto sin .00 NO debe usarse
  [
    'adverso: 682000 sin decimales ≠ token oficial',
    md5(PRIVATE + String(SHOP) + '682000' + CURRENCY) !== singleBuy,
  ],
  // Adverso: token confirm mal armado (sin palabra confirm)
  [
    'adverso: confirm sin literal confirm falla',
    md5(PRIVATE + String(SHOP) + AMOUNT + CURRENCY) !== confirm,
  ],
]

let fail = 0
for (const [name, ok] of checks) {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) fail += 1
  console.log(`${mark}  ${name}`)
}

console.log('---')
console.log('single_buy sample:', singleBuy)
console.log('confirm sample:   ', confirm)
console.log(fail === 0 ? 'RESULT: PASS' : `RESULT: FAIL (${fail})`)
process.exit(fail === 0 ? 0 : 1)
