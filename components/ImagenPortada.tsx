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
 * Misma familia que ProductImage (capa UI ley imágenes).
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
    return <div className={`bg-neutral-200 ${className}`.trim()} aria-hidden />
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      data-portada-frame="imagen-de-portada"
      data-marca={marca}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? marca}
        className="absolute inset-0 h-full w-full box-border"
        style={{ objectFit: fit, objectPosition: 'center' }}
        onError={() => {
          if (idx < candidates.length - 1) setIdx((i) => i + 1)
        }}
      />
    </div>
  )
}
