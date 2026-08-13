import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getBancardConfig,
  parseAndVerifyConfirm,
  type BancardConfirmPayload,
} from '@/lib/payments/bancard'
import {
  confirmarPagoPedido,
  dispararEdBDomicilio,
} from '@/lib/orden/puente-pago-entrega'

/**
 * Confirmación VPOS → comercio (Single Buy).
 * Debe responder HTTP 200 + { status: "success" } en < 30s (manual Bancard).
 * Token: md5(private_key + shop_process_id + "confirm" + amount + currency)
 */
export async function POST(request: Request) {
  const started = Date.now()
  const config = getBancardConfig()
  if (!config) {
    // Sin keys no aceptamos confirmaciones reales
    return NextResponse.json({ status: 'error', messages: 'Bancard no configurado' }, { status: 503 })
  }

  let payload: BancardConfirmPayload
  try {
    payload = (await request.json()) as BancardConfirmPayload
  } catch {
    return NextResponse.json({ status: 'error', messages: 'JSON inválido' }, { status: 400 })
  }

  const parsed = parseAndVerifyConfirm(payload, config.privateKey)
  if (!parsed.ok || parsed.shopProcessId == null) {
    console.warn('[bancard/callback] verify fail', parsed.error)
    return NextResponse.json(
      { status: 'error', messages: parsed.error ?? 'Verificación fallida' },
      { status: 400 },
    )
  }

  const pedidoId = parsed.shopProcessId
  const supabase = createAdminClient()

  const { data: pedido } = await supabase
    .from('pedido_web')
    .select(
      'id, total, pago_estado, cliente_telefono, entrega_telefono_snapshot, entrega_lat, entrega_lng',
    )
    .eq('id', pedidoId)
    .maybeSingle()

  if (!pedido) {
    console.warn('[bancard/callback] pedido inexistente', pedidoId)
    // Igual success para no reintentar eterno en id fantasma — o error?
    // Manual: comercio debe responder success si procesó. Pedido inexistente = error.
    return NextResponse.json({ status: 'error', messages: 'Pedido no encontrado' }, { status: 404 })
  }

  if (!parsed.approved) {
    await supabase
      .from('pedido_web')
      .update({
        pago_estado: 'FALLIDO',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .neq('pago_estado', 'PAGADO')

    console.info('[bancard/callback] rechazado', {
      pedidoId,
      code: parsed.operation?.response_code,
      ms: Date.now() - started,
    })
    // Bancard espera success de recepción aunque el pago falle
    return NextResponse.json({ status: 'success' })
  }

  const amountGs = parsed.amountGs ?? Math.round(Number(pedido.total) || 0)
  const conf = await confirmarPagoPedido(supabase, {
    pedidoId,
    amount: amountGs,
    shopProcessId: pedidoId,
    proveedor: 'BANCARD',
    authorizationNumber: parsed.operation?.authorization_number
      ? String(parsed.operation.authorization_number)
      : null,
  })

  if (!conf.ok) {
    console.error('[bancard/callback] marcar PAGADO', conf.error)
    return NextResponse.json(
      { status: 'error', messages: conf.error ?? 'No se pudo marcar PAGADO' },
      { status: 500 },
    )
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

  console.info('[bancard/callback] OK', {
    pedidoId,
    already: conf.already,
    ms: Date.now() - started,
  })

  return NextResponse.json({ status: 'success' })
}
