'use client'

import { useState } from 'react'
import { imagenPortadaCandidates, type PortadaTier } from '@/lib/imagen-portada'

type Props = {
  marca: string
  tier?: PortadaTier
  className?: string
  /** cover = banner hero/tarjeta · contain = logo-like */
  fit?: 'cover' | 'contain'
  alt?: string
}

/**
 * Marco sagrado portada — overflow hidden + object-fit.
 * El contenedor debe ser absolute inset-0 (o tamaño fijo) en el padre.
 */
export default function ImagenPortada({
  marca,
  tier = 'md',
  className = '',
  fit = 'cover',
  alt,
}: Props) {
  const candidates = imagenPortadaCandidates(marca, tier)
  const [idx, setIdx] = useState(0)
  const src = candidates[idx] ?? null

  if (!src) {
    return (
      <div
        className={`bg-neutral-800 ${className}`.trim()}
        aria-hidden
        data-portada-frame="sin-url"
      />
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
        }}
      />
    </div>
  )
}
