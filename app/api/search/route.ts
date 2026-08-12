import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeColor } from '@/lib/colors'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'

/** Autocomplete compartido header + sidebar · mismo `?q=` del catálogo. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = createAdminClient()
  const pattern = `%${q}%`
  const results: { tipo: string; label: string; href: string }[] = []
  const seen = new Set<string>()

  const add = (tipo: string, label: string, href: string) => {
    const key = `${tipo}:${label}`
    if (!seen.has(key)) {
      seen.add(key)
      results.push({ tipo, label, href })
    }
  }

  const [marcasRes, estilosRes, coloresRes, refsRes, refsCodRes, lineasRes] =
    await Promise.all([
      soloVendibleCatalogo(supabase.from('v_stock_web').select('marca'))
        .ilike('marca', pattern)
        .limit(5),
      soloVendibleCatalogo(supabase.from('v_stock_web').select('descp_grupo_estilo'))
        .ilike('descp_grupo_estilo', pattern)
        .not('descp_grupo_estilo', 'is', null)
        .limit(8),
      soloVendibleCatalogo(supabase.from('v_stock_web').select('color_nombre'))
        .ilike('color_nombre', pattern)
        .limit(10),
      soloVendibleCatalogo(
        supabase.from('v_stock_web').select('referencia_descripcion, marca, referencia_codigo'),
      )
        .ilike('referencia_descripcion', pattern)
        .limit(6),
      soloVendibleCatalogo(supabase.from('v_stock_web').select('referencia_codigo, marca'))
        .ilike('referencia_codigo', pattern)
        .limit(6),
      soloVendibleCatalogo(supabase.from('v_stock_web').select('linea_codigo'))
        .ilike('linea_codigo', pattern)
        .limit(6),
    ])

  for (const m of Array.from(new Set(marcasRes.data?.map((r) => r.marca).filter(Boolean)))) {
    add('Marca', m, `/catalogo?marca=${encodeURIComponent(m)}`)
  }

  for (const e of Array.from(
    new Set(estilosRes.data?.map((r) => r.descp_grupo_estilo).filter(Boolean)),
  )) {
    add('Estilo', e, `/catalogo?grupo_estilo=${encodeURIComponent(e)}`)
  }

  for (const c of Array.from(
    new Set(coloresRes.data?.map((r) => normalizeColor(r.color_nombre)).filter(Boolean)),
  )) {
    add('Color', c, `/catalogo?colores=${encodeURIComponent(c)}`)
  }

  for (const l of Array.from(
    new Set(lineasRes.data?.map((r) => String(r.linea_codigo ?? '').trim()).filter(Boolean)),
  )) {
    add('Línea', l, `/catalogo?linea=${encodeURIComponent(l)}`)
  }

  for (const r of refsRes.data ?? []) {
    const label =
      String(r.referencia_descripcion ?? '').trim() ||
      String(r.referencia_codigo ?? '').trim()
    if (label) {
      add(
        'Producto',
        label,
        `/catalogo?q=${encodeURIComponent(String(r.referencia_codigo ?? label).trim())}`,
      )
    }
  }
  for (const r of refsCodRes.data ?? []) {
    const cod = String(r.referencia_codigo ?? '').trim()
    if (cod) {
      add('Producto', cod, `/catalogo?q=${encodeURIComponent(cod)}`)
    }
  }

  // Siempre ofrecer filtro texto libre (paridad Enter en ambos campos)
  add('Buscar', q, `/catalogo?q=${encodeURIComponent(q)}`)

  return NextResponse.json({ results: results.slice(0, 14) })
}
