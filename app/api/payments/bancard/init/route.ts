import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  BANCARD_SECURITY_CONTRACT,
  createBancardPayment,
  isBancardEnabled,
  shopProcessIdForPedido,
} from '@/lib/payments/bancard'
import {
  confirmarPagoSimulado,
  dispararEdBDomicilio,
} from '@/lib/orden/puente-pago-entrega'

/**
 * Inicia pago Bancard Single Buy.
 * Sin keys → SIM (desarrollo / Laura pendiente).
 * Con keys → process_id + script iframe (PCI: tarjeta solo en VPOS).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pedido_id?: number
      token?: string
      amount?: number
      description?: string
    }

    const pedidoId = Number(body.pedido_id)
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!Number.isFinite(pedidoId) || pedidoId <= 0 || !token) {
      return NextResponse.json(
        { error: 'pedido_id y token requeridos', security: BANCARD_SECURITY_CONTRACT },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const { data: pedido, error } = await supabase
      .from('pedido_web')
      .select(
        'id, total, pago_estado, token_acceso, cliente_nombre, cliente_telefono, entrega_telefono_snapshot, entrega_lat, entrega_lng, entrega_estado',
      )
      .eq('id', pedidoId)
      .eq('token_acceso', token)
      .maybeSingle()

    if (error || !pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado o token inválido' }, { status: 404 })
    }

    if (pedido.pago_estado === 'PAGADO') {
      return NextResponse.json({
        status: 'YA_PAGADO',
        pago_estado: 'PAGADO',
        pedido_estado: 'CONFIRMADO',
      })
    }

    const amount = Math.round(Number(pedido.total) || 0)
    if (amount <= 0) {
      return NextResponse.json({ error: 'Total de pedido inválido' }, { status: 400 })
    }

    // Cliente no puede mandar otro monto: se ignora body.amount
    const shop_process_id = shopProcessIdForPedido(pedidoId)

    if (!isBancardEnabled()) {
      const sim = await confirmarPagoSimulado(supabase, {
        pedidoId,
        amount,
        shopProcessId: `SIM-${shop_process_id}`,
      })
      if (!sim.ok) {
        return NextResponse.json({ error: sim.error ?? 'No se pudo simular pago' }, { status: 500 })
      }

      const tel =
        (pedido.entrega_telefono_snapshot as string | null) ||
        (pedido.cliente_telefono as string | null)
      await dispararEdBDomicilio(supabase, {
        pedidoId,
        telefono: tel,
        lat: pedido.entrega_lat as number | null,
        lng: pedido.entrega_lng as number | null,
      })

      return NextResponse.json({
        status: 'SIMULADO',
        pago_estado: 'PAGADO',
        pedido_estado: 'CONFIRMADO',
        shop_process_id: `SIM-${shop_process_id}`,
        amount,
        currency: 'PYG',
        security: BANCARD_SECURITY_CONTRACT,
        mensaje:
          'Pago simulado OK · pedido CONFIRMADO · EDB disparado. (Bancard real cuando lleguen credenciales)',
      })
    }

    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'https://www.bazzar.com.py'

    const result = await createBancardPayment({
      pedidoId,
      amount,
      description: body.description ?? `Pedido Bazzar #${pedidoId}`,
      returnUrl: `${site}/pedido/${pedidoId}?t=${encodeURIComponent(token)}&pago=ok`,
      cancelUrl: `${site}/pedido/${pedidoId}?t=${encodeURIComponent(token)}&pago=cancelado`,
    })

    await supabase
      .from('pedido_web')
      .update({
        pago_estado: 'INICIADO',
        pago_proveedor: 'BANCARD',
        pago_ref_externa: String(shop_process_id),
        pago_monto: amount,
        pago_moneda: 'PYG',
        pago_iniciado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)

    if (result.status === 'ERROR') {
      return NextResponse.json(
        {
          status: 'ERROR',
          error: result.error,
          security: result.security,
          shop_process_id: result.shop_process_id,
          amount,
          currency: 'PYG',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      status: 'IFRAME',
      process_id: result.process_id,
      shop_process_id: result.shop_process_id,
      checkoutScriptUrl: result.checkoutScriptUrl,
      env: result.env,
      amount: result.amount,
      currency: 'PYG',
      security: BANCARD_SECURITY_CONTRACT,
    })
  } catch (e) {
    console.error('[bancard/init]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
