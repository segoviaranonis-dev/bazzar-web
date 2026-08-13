/**
 * Smoke latencia filtros catálogo — 5 combos, meta p95 < 1000 ms.
 * Uso: node scripts/_smoke_catalogo_filtros_latency.mjs [baseUrl]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:3002'

const COMBOS = [
  '/catalogo',
  '/catalogo?ramo_tipo=CALZADO',
  '/catalogo?ramo_tipo=CALZADO&marca=VIZZANO',
  '/catalogo?ramo_tipo=CONFECCIONES',
  '/catalogo?ramo_tipo=CALZADO&marca=BEIRA%20RIO&grupo_estilo=TACO%20BAJO',
]

async function once(path) {
  const t0 = performance.now()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
  })
  const body = await res.text()
  const ms = Math.round(performance.now() - t0)
  const hasGrid =
    body.includes('ProductoCard') ||
    body.includes('pares') ||
    body.includes('modelos') ||
    body.includes('Sin resultados')
  return { path, status: res.status, ms, hasGrid, len: body.length }
}

async function main() {
  console.log(`BASE=${BASE}`)
  const rows = []
  // warm
  await once('/catalogo').catch(() => null)
  for (const path of COMBOS) {
    const r = await once(path)
    rows.push(r)
    console.log(
      `${r.status} ${String(r.ms).padStart(5)}ms grid=${r.hasGrid} ${path}`,
    )
  }
  // second pass (cache hit esperado en servidor)
  console.log('--- pass 2 (cache) ---')
  const pass2 = []
  for (const path of COMBOS) {
    const r = await once(path)
    pass2.push(r)
    console.log(
      `${r.status} ${String(r.ms).padStart(5)}ms grid=${r.hasGrid} ${path}`,
    )
  }
  const allMs = [...rows, ...pass2].map((r) => r.ms).sort((a, b) => a - b)
  const p95 = allMs[Math.min(allMs.length - 1, Math.floor(allMs.length * 0.95))]
  const max = allMs[allMs.length - 1]
  const fail = allMs.some((m) => m >= 1000) || rows.some((r) => r.status !== 200)
  console.log(
    JSON.stringify(
      {
        p95_ms: p95,
        max_ms: max,
        pass: !fail && p95 < 1000,
        meta: 'p95 < 1000',
      },
      null,
      2,
    ),
  )
  process.exit(fail || p95 >= 1000 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
