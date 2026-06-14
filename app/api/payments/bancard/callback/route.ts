import { NextResponse } from 'next/server'
import { getBancardConfig } from '@/lib/payments/bancard'

/**
 * Webhook IPN Bancard — stub ETAPA-002.
 * Implementar verificación de firma y actualización pedido_web cuando lleguen credenciales.
 */
export async function POST(request: Request) {
  const config = getBancardConfig()
  if (!config) {
    return NextResponse.json({ error: 'Bancard no configurado' }, { status: 503 })
  }

  const secret = process.env.BANCARD_CALLBACK_SECRET
  if (!secret) {
    console.warn('[bancard/callback] BANCARD_CALLBACK_SECRET no definido — rechazando')
    return NextResponse.json({ error: 'Callback no habilitado' }, { status: 503 })
  }

  try {
    const body = await request.json()
    console.info('[bancard/callback] evento recibido (stub)', {
      keys: Object.keys(body ?? {}),
      env: config.env,
    })
    // TODO: validar firma Bancard, mapear shop_process_id → pedido_web, estado CONFIRMADO
    return NextResponse.json({ ok: true, status: 'stub_received' })
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }
}
