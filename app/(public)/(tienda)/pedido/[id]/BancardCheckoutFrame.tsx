'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    Bancard?: {
      Checkout: {
        createForm: (
          containerId: string,
          processId: string,
          options?: { styles?: Record<string, string> },
        ) => void,
      }
    }
  }
}

type Props = {
  processId: string
  checkoutScriptUrl: string
  containerId?: string
}

/**
 * Iframe hospedado Bancard — NUNCA pedir PAN/CVV en Bazzar.
 * Script oficial: bancard-checkout-*.js → Bancard.Checkout.createForm
 */
export function BancardCheckoutFrame({
  processId,
  checkoutScriptUrl,
  containerId = 'bancard-checkout-iframe',
}: Props) {
  const [err, setErr] = useState<string | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-bancard-checkout="1"]`,
    )

    function create() {
      try {
        const el = document.getElementById(containerId)
        if (el) el.innerHTML = ''
        window.Bancard?.Checkout.createForm(containerId, processId, {
          styles: {
            'button-background-color': '#F97316',
            'button-text-color': '#ffffff',
            'button-border-radius': '12px',
            'form-background-color': '#ffffff',
            'input-border-color': '#e2e8f0',
          },
        })
      } catch (e) {
        console.error('[bancard iframe]', e)
        setErr('No se pudo montar el formulario Bancard. Recargá la página.')
      }
    }

    if (window.Bancard?.Checkout) {
      create()
      return
    }

    const script = existing ?? document.createElement('script')
    if (!existing) {
      script.src = checkoutScriptUrl
      script.async = true
      script.dataset.bancardCheckout = '1'
      script.onerror = () => setErr('No se pudo cargar el script de Bancard (red / CSP).')
      document.body.appendChild(script)
    }
    script.onload = () => create()
    if (window.Bancard?.Checkout) create()
  }, [processId, checkoutScriptUrl, containerId])

  return (
    <div className="mt-3">
      <div
        id={containerId}
        className="min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
      />
      {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        Pagás en el formulario seguro de Bancard. Bazzar nunca ve ni guarda el número de tu tarjeta.
      </p>
    </div>
  )
}
