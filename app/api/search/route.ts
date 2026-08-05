import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeColor } from '@/lib/colors'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const pattern  = `%${q}%`
  const results: { tipo: string; label: string; href: string }[] = []
  const seen = new Set<string>()

  const add = (tipo: string, label: string, href: string) => {
    const key = `${tipo}:${label}`
    if (!seen.has(key)) { seen.add(key); results.push({ tipo, label, href }) }
  }

  // Búsqueda concurrente en 4 dimensiones
  const [marcasRes, estilosRes, coloresRes, refsRes] = await Promise.all([
    soloVendibleCatalogo(supabase.from('v_stock_web').select('marca')).ilike('marca', pattern).limit(5),
    soloVendibleCatalogo(supabase.from('v_stock_web').select('descp_grupo_estilo')).ilike('descp_grupo_estilo', pattern).not('descp_grupo_estilo', 'is', null).limit(8),
    soloVendibleCatalogo(supabase.from('v_stock_web').select('color_nombre')).ilike('color_nombre', pattern).limit(10),
    soloVendibleCatalogo(supabase.from('v_stock_web').select('referencia_descripcion, marca')).ilike('referencia_descripcion', pattern).limit(6),
  ])

  // Marcas
  const marcasUnicas = Array.from(new Set(marcasRes.data?.map(r => r.marca).filter(Boolean)))
  for (const m of marcasUnicas) {
    add('Marca', m, `/catalogo?marca=${encodeURIComponent(m)}`)
  }

  // Estilos
  const estilosUnicos = Array.from(new Set(estilosRes.data?.map(r => r.descp_grupo_estilo).filter(Boolean)))
  for (const e of estilosUnicos) {
    add('Estilo', e, `/catalogo?grupo_estilo=${encodeURIComponent(e)}`)
  }

  // Colores normalizados (BLANCO/DORADO → "Blanco")
  const coloresBase = Array.from(new Set(coloresRes.data?.map(r => normalizeColor(r.color_nombre)).filter(Boolean)))
  for (const c of coloresBase) {
    add('Color', c, `/catalogo?colores=${encodeURIComponent(c)}`)
  }

  // Referencias/descripciones
  for (const r of refsRes.data ?? []) {
    if (r.referencia_descripcion) {
      add('Producto', r.referencia_descripcion, `/catalogo?marca=${encodeURIComponent(r.marca)}`)
    }
  }

  return NextResponse.json({ results: results.slice(0, 12) })
}
