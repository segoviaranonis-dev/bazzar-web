'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { PuntoEntrega } from '@/lib/maps/types'

const Inner = dynamic(
  () => import('./MapaEntregaInner').then((m) => m.MapaEntregaInner),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Cargando mapa…</p>
      </div>
    ),
  },
)

type Props = {
  open: boolean
  initial?: PuntoEntrega | null
  onConfirm: (p: PuntoEntrega) => void
  onClose: () => void
}

export function MapaEntregaModal({ open, initial, onConfirm, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return <Inner initial={initial} onConfirm={onConfirm} onClose={onClose} />
}
