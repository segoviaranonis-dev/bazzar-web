import { NextResponse } from 'next/server'
import { loadGeneroMegaFacets } from '@/lib/nav/genero-mega'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET — facetas mega por género · ?genero_id=2 (Caballeros). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const g = Number(searchParams.get('genero_id'))
    if (!Number.isFinite(g) || g <= 0) {
      return NextResponse.json(
        { ok: false, msg: 'genero_id requerido' },
        { status: 400 },
      )
    }
    const data = await loadGeneroMegaFacets(g)
    return NextResponse.json({ ok: true, ...data })
  } catch (e) {
    console.error('[api/nav/genero]', e)
    return NextResponse.json(
      { ok: false, msg: e instanceof Error ? e.message : 'error' },
      { status: 500 },
    )
  }
}
