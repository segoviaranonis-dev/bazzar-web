import { NextResponse } from 'next/server'
import { isAuditoriaLocalEnabled } from '@/lib/auditoria-local/enabled'
import { getAuditoriaLocalCruce } from '@/lib/auditoria-local/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAuditoriaLocalEnabled()) {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 404 })
  }
  try {
    const data = await getAuditoriaLocalCruce()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[auditoria-local]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error auditoría' },
      { status: 500 },
    )
  }
}
