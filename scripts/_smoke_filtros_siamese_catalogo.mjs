/**
 * Smoke filtros catálogo Bazzar — hermanos siameses (local :3002).
 * node scripts/_smoke_filtros_siamese_catalogo.mjs
 */
const BASE = process.env.BAZZAR_URL || 'http://127.0.0.1:3002'

const CASES = [
  { name: 'home', path: '/catalogo' },
  { name: 'calzado', path: '/catalogo?ramo_tipo=CALZADO' },
  { name: 'confecciones', path: '/catalogo?ramo_tipo=CONFECCIONES' },
  { name: 'tipo_normal', path: '/catalogo?ramo_tipo=CALZADO&tipo_grupos=normal' },
  { name: 'tipo_promo', path: '/catalogo?ramo_tipo=CALZADO&tipo_grupos=promo' },
  { name: 'tipo_liq', path: '/catalogo?ramo_tipo=CALZADO&tipo_grupos=liquidacion' },
  { name: 'tipo_cartera', path: '/catalogo?ramo_tipo=CALZADO&tipo_grupos=carteras' },
  { name: 'marca_actvitta', path: '/catalogo?marca=ACTVITTA' },
  { name: 'estilo_botas', path: '/catalogo?grupo_estilo=BOTAS' },
  { name: 'q_search', path: '/catalogo?q=40000' },
  { name: 'combo', path: '/catalogo?ramo_tipo=CALZADO&marca=ACTVITTA&tipo_grupos=normal' },
]

async function hit(path) {
  const t0 = Date.now()
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  const html = await res.text()
  const ms = Date.now() - t0
  const hasDim = html.includes('Dimensiones')
  const hasMol = html.includes('Molécula')
  const noMega = !html.includes('Envíos a todo el país') && !/>Mujeres</.test(html)
  const sinResultados = html.includes('Sin resultados')
  const modelos = (html.match(/(\d+)\s*modelos/) || [])[1]
  return {
    path,
    status: res.status,
    ms,
    hasDim,
    hasMol,
    noMega,
    sinResultados,
    modelos: modelos ?? '?',
    ok: res.status === 200 && hasDim && hasMol && noMega,
  }
}

async function main() {
  console.log('SMOKE filtros siamese ·', BASE)
  const rows = []
  for (const c of CASES) {
    try {
      const r = await hit(c.path)
      rows.push({ ...c, ...r })
      console.log(
        `${r.ok ? 'PASS' : 'FAIL'} ${c.name} · ${r.status} · ${r.ms}ms · modelos=${r.modelos} · empty=${r.sinResultados} · dim=${r.hasDim} mol=${r.hasMol} noMega=${r.noMega}`,
      )
    } catch (e) {
      rows.push({ ...c, ok: false, err: String(e.message || e) })
      console.log(`FAIL ${c.name} · ${e.message}`)
    }
  }
  const pass = rows.filter((r) => r.ok).length
  console.log(`\nTOTAL ${pass}/${rows.length}`)
  process.exit(pass === rows.length ? 0 : 1)
}

main()
