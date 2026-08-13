'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BancardCheckoutFrame } from './BancardCheckoutFrame'

type Props = {
  pedidoId: number
  token: string
  total: number
  pagoEstado?: string | null
  /** Tras «Confirmar pedido»: arranca pasarela sin segundo clic */
  autoIniciarPago?: boolean
  /** Query ?pago=ok|cancelado|auto (servidor) */
  pagoQuery?: string | null
}

type IframePayload = {
  process_id: string
  checkoutScriptUrl: string
}

/**
 * Pago cliente. Sin keys → SIM. Con keys → iframe Bancard (PCI).
 * EDB = solo servidor (callback / confirm-status).
 */
export function PuentePagoEntrega({
  pedidoId,
  token,
  total,
  pagoEstado,
  autoIniciarPago = false,
  pagoQuery = null,
}: Props) {
  const router = useRouter()
  const started = useRef(false)
  const polled = useRef(false)
  const [msgPago, setMsgPago] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [localPagado, setLocalPagado] = useState(pagoEstado === 'PAGADO')
  const [iframe, setIframe] = useState<IframePayload | null>(null)
  const [modoReal, setModoReal] = useState(false)

  async function pollConfirmStatus() {
    try {
      const res = await fetch('/api/payments/bancard/confirm-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: pedidoId, token }),
      })
      const data = await res.json()
      if (data.pago_estado === 'PAGADO' || data.status === 'PAGADO') {
        setLocalPagado(true)
        setIframe(null)
        setMsgPago('Pago confirmado por Bancard. Pedido listo · delivery en marcha.')
        router.refresh()
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  }

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
          description: `Pedido Bazzar #${pedidoId}`,
        }),
      })
      const data = await res.json()

      if (data.status === 'IFRAME' && data.process_id && data.checkoutScriptUrl) {
        setModoReal(true)
        setIframe({
          process_id: String(data.process_id),
          checkoutScriptUrl: String(data.checkoutScriptUrl),
        })
        setMsgPago('Completá el pago en el formulario Bancard abajo.')
        return
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }

      if (data.status === 'SIMULADO' || data.status === 'YA_PAGADO' || data.pago_estado === 'PAGADO') {
        setLocalPagado(true)
        setMsgPago(
          data.mensaje ??
            'Pago confirmado. Pedido CONFIRMADO · datos en Bóveda + EDB.',
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

  // Vuelta de return_url Bancard (?pago=ok): consultar confirmación
  useEffect(() => {
    if (polled.current) return
    if (pagoEstado === 'PAGADO' || localPagado) return
    if (pagoQuery !== 'ok') return
    polled.current = true
    setMsgPago('Verificando pago con Bancard…')
    void (async () => {
      setBusy(true)
      const ok = await pollConfirmStatus()
      if (!ok) {
        setMsgPago(
          'Aún no llegó la confirmación. Si ya pagaste, esperá unos segundos y recargá.',
        )
      }
      setBusy(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoQuery])

  const pagado = localPagado || pagoEstado === 'PAGADO'
  const cancelado = pagoQuery === 'cancelado'

  return (
    <div className="mt-6">
      <div
        className={`rounded-xl border px-5 py-4 ${
          pagado
            ? 'border-green-200 bg-green-50'
            : cancelado
              ? 'border-slate-200 bg-slate-50'
              : 'border-amber-200 bg-amber-50'
        }`}
      >
        <p
          className={`text-sm font-bold ${
            pagado ? 'text-green-900' : cancelado ? 'text-slate-800' : 'text-amber-900'
          }`}
        >
          {pagado
            ? 'Pago confirmado'
            : cancelado
              ? 'Pago cancelado'
              : 'Pago seguro (Bancard VPOS)'}
        </p>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            pagado ? 'text-green-800' : cancelado ? 'text-slate-600' : 'text-amber-800'
          }`}
        >
          {pagado
            ? modoReal || pagoEstado === 'PAGADO'
              ? 'Pago verificado. Monto servidor: Gs. '
              : 'Simulación (sin keys Bancard aún). Monto servidor: Gs. '
            : cancelado
              ? 'Podés reintentar cuando quieras. Monto: Gs. '
              : iframe
                ? 'Formulario Bancard (tarjeta solo en su sistema). Monto: Gs. '
                : 'Al iniciar: con keys → iframe Bancard; sin keys → simulación. Monto: Gs. '}
          {new Intl.NumberFormat('es-PY').format(total)}. Estado:{' '}
          <strong>{pagado ? 'PAGADO' : pagoEstado ?? 'PENDIENTE'}</strong>
        </p>
        {!pagado && !iframe && (
          <button
            type="button"
            disabled={busy}
            onClick={iniciarPago}
            className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#F97316' }}
          >
            {busy ? 'Preparando pago…' : cancelado ? 'Reintentar pago' : 'Ir a pasarela de pago'}
          </button>
        )}
        {iframe && !pagado && (
          <BancardCheckoutFrame
            processId={iframe.process_id}
            checkoutScriptUrl={iframe.checkoutScriptUrl}
          />
        )}
        {msgPago && (
          <p
            className={`mt-2 text-xs ${
              pagado ? 'text-green-900' : 'text-amber-900'
            }`}
          >
            {msgPago}
          </p>
        )}
      </div>
    </div>
  )
}
