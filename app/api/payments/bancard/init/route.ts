import { NextResponse } from 'next/server'
import { createBancardPayment } from '@/lib/payments/bancard'

/**
 * Inicia pago Bancard — stub ETAPA-002.
 * Llamar post-crear pedido cuando existan credenciales sandbox.
 */
export async function POST(request: Request) {
  try {
    const { pedido_id, amount, description } = await request.json() as {
      pedido_id?: number
      amount?: number
      description?: string
    }

    if (!pedido_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'pedido_id y amount requeridos' }, { status: 400 })
    }

    const result = await createBancardPayment({
      pedidoId: pedido_id,
      amount,
      description: description ?? `Pedido Bazzar #${pedido_id}`,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 503 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
