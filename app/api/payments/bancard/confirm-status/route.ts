import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getSingleBuyConfirmation,
  isBancardEnabled,
  shopProcessIdForPedido,
} from '@/lib/payments/bancard'
import {
  confirmarPagoPedido,
  dispararEdBDomicilio,
} from '@/lib/orden/puente-pago-entrega'

/**
 * Fallback post return_url (?pago=ok): consulta VPOS si el callback aún no llegó.
 * Cliente autentica con token_acceso del pedido.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pedido_id?: number; token?: string }
    const pedidoId = Number(body.pedido_id)
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!Number.isFinite(pedidoId) || pedidoId <= 0 || !token) {
      return NextResponse.json({ error: 'pedido_id y token requeridos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: pedido, error } = await supabase
      .from('pedido_web')
      .select(
        'id, total, pago_estado, cliente_telefono, entrega_telefono_snapshot, entrega_lat, entrega_lng',
      )
      .eq('id', pedidoId)
      .eq('token_acceso', token)
      .maybeSingle()

    if (error || !pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (pedido.pago_estado === 'PAGADO') {
      return NextResponse.json({ status: 'PAGADO', pago_estado: 'PAGADO' })
    }

    if (!isBancardEnabled()) {
      return NextResponse.json({
        status: pedido.pago_estado ?? 'PENDIENTE',
        pago_estado: pedido.pago_estado,
      })
    }

    const shopId = shopProcessIdForPedido(pedidoId)
    const vpos = await getSingleBuyConfirmation(shopId)
    if (!vpos.ok || !vpos.approved) {
      return NextResponse.json({
        status: pedido.pago_estado ?? 'INICIADO',
        pago_estado: pedido.pago_estado,
        vpos_ok: vpos.ok,
        approved: false,
      })
    }

    const amount = Math.round(Number(pedido.total) || 0)
    const conf = await confirmarPagoPedido(supabase, {
      pedidoId,
      amount,
      shopProcessId: shopId,
      proveedor: 'BANCARD',
    })

    if (!conf.ok) {
      return NextResponse.json({ error: conf.error }, { status: 500 })
    }

    if (!conf.already) {
      const tel =
        (pedido.entrega_telefono_snapshot as string | null) ||
        (pedido.cliente_telefono as string | null)
      await dispararEdBDomicilio(supabase, {
        pedidoId,
        telefono: tel,
        lat: pedido.entrega_lat as number | null,
        lng: pedido.entrega_lng as number | null,
      })
    }

    return NextResponse.json({ status: 'PAGADO', pago_estado: 'PAGADO', via: 'get_confirmation' })
  } catch (e) {
    console.error('[bancard/confirm-status]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
