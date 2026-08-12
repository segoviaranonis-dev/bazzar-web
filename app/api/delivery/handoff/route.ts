import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { marcarHandoffDelivery } from '@/lib/orden/puente-pago-entrega'
import { isValidPedidoToken } from '@/lib/security/pedido-token'

/**
 * Puente Delivery Bazzar — marca handoff desde pedido confirmado.
 * Delivery app (:3005) consumirá este contrato / snapshot_transaccion.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pedido_id?: number
      token?: string
      ventana?: string
    }
    if (!body.pedido_id || !isValidPedidoToken(body.token)) {
      return NextResponse.json({ error: 'pedido_id y token válidos requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: pedido } = await supabase
      .from('pedido_web')
      .select('id, token_acceso, snapshot_transaccion, entrega_estado')
      .eq('id', body.pedido_id)
      .eq('token_acceso', body.token)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const result = await marcarHandoffDelivery(supabase, body.pedido_id, body.ventana)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Migración Bóveda Oro WEB pendiente', stub: true },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      pedido_id: body.pedido_id,
      entrega_estado: 'HANDOFF_DELIVERY',
      carrier: 'DELIVERY_BAZZAR',
      delivery_app: 'http://localhost:3005',
      snapshot: pedido.snapshot_transaccion,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
