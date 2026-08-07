'use client'

import { useState } from 'react'
import { imagenPortadaCandidates, type PortadaTier } from '@/lib/imagen-portada'

type Props = {
  marca: string
  tier?: PortadaTier
  className?: string
  fit?: 'cover' | 'contain'
  alt?: string
  /** false = reserva (Kyly/Milon) · no dispara GET a Storage */
  lista?: boolean
}

export default function ImagenPortada({
  marca,
  tier = 'md',
  className = '',
  fit = 'cover',
  alt,
  lista = true,
}: Props) {
  const candidates = lista ? imagenPortadaCandidates(marca, tier) : []
  const [idx, setIdx] = useState(0)
  const [agotado, setAgotado] = useState(false)
  const src = !lista || agotado ? null : (candidates[idx] ?? null)

  if (!src) {
    return (
      <div
        className={`flex items-end bg-neutral-900 ${className}`.trim()}
        aria-hidden
        data-portada-frame={lista ? 'sin-archivo' : 'pendiente'}
        data-marca={marca}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12), transparent 55%)',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden ${className}`.trim()}
      data-portada-frame="imagen-de-portada"
      data-marca={marca}
      data-portada-src={src}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? marca}
        decoding="async"
        fetchPriority={tier === 'lg' ? 'high' : 'auto'}
        className="block h-full w-full box-border"
        style={{
          objectFit: fit,
          objectPosition: 'center',
          width: '100%',
          height: '100%',
          minHeight: '100%',
        }}
        onError={() => {
          if (idx < candidates.length - 1) setIdx((i) => i + 1)
          else setAgotado(true)
        }}
      />
    </div>
  )
}
