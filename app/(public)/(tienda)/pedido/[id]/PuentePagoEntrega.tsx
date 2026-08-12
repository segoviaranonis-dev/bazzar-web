'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  pedidoId: number
  token: string
  total: number
  pagoEstado?: string | null
  /** Tras «Confirmar pedido»: arranca pasarela sin segundo clic */
  autoIniciarPago?: boolean
}

/**
 * Solo pago (cliente). Sin Bancard → simula PAGADO + CONFIRMADO.
 * EDB = disparo servidor — no UI aquí.
 */
export function PuentePagoEntrega({
  pedidoId,
  token,
  total,
  pagoEstado,
  autoIniciarPago = false,
}: Props) {
  const router = useRouter()
  const started = useRef(false)
  const [msgPago, setMsgPago] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [localPagado, setLocalPagado] = useState(pagoEstado === 'PAGADO')

  async function iniciarPago() {
    setBusy(true)
    setMsgPago(null)
    try {
      const res = await fetch('/api/payments/bancard/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedido_id: pedidoId,
          token,
          amount: total,
          description: `Pedido Bazzar #${pedidoId}`,
        }),
      })
      const data = await res.json()

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }

      if (data.status === 'SIMULADO' || data.status === 'YA_PAGADO' || data.pago_estado === 'PAGADO') {
        setLocalPagado(true)
        setMsgPago(
          data.mensaje ??
            'Pago confirmado (simulación). Pedido CONFIRMADO · datos en Bóveda + EDB.',
        )
        router.refresh()
        return
      }

      if (!res.ok) {
        setMsgPago(data.error ?? 'No se pudo iniciar el pago. Reintentá.')
        return
      }
      setMsgPago('Pago iniciado.')
    } catch {
      setMsgPago('No se pudo contactar la pasarela. Reintentá o coordiná por WhatsApp.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!autoIniciarPago || started.current) return
    if (localPagado || pagoEstado === 'PAGADO') return
    started.current = true
    void iniciarPago()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoIniciarPago])

  const pagado = localPagado || pagoEstado === 'PAGADO'

  return (
    <div className="mt-6">
      <div
        className={`rounded-xl border px-5 py-4 ${
          pagado ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <p className={`text-sm font-bold ${pagado ? 'text-green-900' : 'text-amber-900'}`}>
          {pagado ? 'Pago confirmado' : 'Pago seguro (Bancard VPOS)'}
        </p>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            pagado ? 'text-green-800' : 'text-amber-800'
          }`}
        >
          {pagado
            ? 'Simulación OK (sin credenciales Bancard). Monto servidor: Gs. '
            : 'Sin keys Bancard: este botón SIMULA pago + confirmación. Monto: Gs. '}
          {new Intl.NumberFormat('es-PY').format(total)}. Estado:{' '}
          <strong>{pagado ? 'PAGADO' : pagoEstado ?? 'PENDIENTE'}</strong>
        </p>
        {!pagado && (
          <button
            type="button"
            disabled={busy}
            onClick={iniciarPago}
            className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#F97316' }}
          >
            {busy ? 'Confirmando pago…' : 'Ir a pasarela de pago'}
          </button>
        )}
        {msgPago && (
          <p className={`mt-2 text-xs ${pagado ? 'text-green-900' : 'text-amber-900'}`}>{msgPago}</p>
        )}
      </div>
    </div>
  )
}
