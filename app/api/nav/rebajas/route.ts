import { NextResponse } from 'next/server'
import { loadRebajasMegaFacets } from '@/lib/nav/rebajas-mega'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET — facetas mega-menú Rebajas (género · marca · estilo + portada BR Sport). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const g = Number(searchParams.get('genero_id'))
    const data = await loadRebajasMegaFacets({
      genero_id: Number.isFinite(g) && g > 0 ? g : null,
    })
    return NextResponse.json({ ok: true, ...data })
  } catch (e) {
    console.error('[api/nav/rebajas]', e)
    return NextResponse.json(
      { ok: false, msg: e instanceof Error ? e.message : 'error' },
      { status: 500 },
    )
  }
}
