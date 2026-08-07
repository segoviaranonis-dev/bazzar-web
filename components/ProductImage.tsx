'use client'

import { useMemo, useState } from 'react'
import {
  productImageCandidates,
  productImageFallbackStyle,
  resolveColorCodigoImagen,
  resolveImagenColorExcel638,
  resolveMaterialCodigoImagen,
  type ImageVariant,
  type StockImageInput,
} from '@/lib/product-image'
import { PROVEEDOR_CONFECCIONES_KYLY } from '@/lib/productImageProtocol'

type Props = {
  item: Pick<
    StockImageInput,
    | 'linea_codigo'
    | 'referencia_codigo'
    | 'material_code'
    | 'color_code'
    | 'color_nombre'
    | 'id_material_f9'
    | 'id_color_f9'
    | 'proveedor_importacion_id'
    | 'ppd_color_codigo'
  >
  alt: string
  variant?: ImageVariant
  priority?: boolean
  className?: string
  candidates?: string[]
}

/** Imagen NIIF — marco contain · tiers sm/lg · cadena retry */
export function ProductImage({
  item,
  alt,
  variant = 'thumb',
  priority = false,
  className = '',
  candidates: candidatesProp,
}: Props) {
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState(false)

  const linea = String(item.linea_codigo ?? '')
  const referencia = String(item.referencia_codigo ?? '')
  const material = resolveMaterialCodigoImagen(item)
  const color = resolveColorCodigoImagen(item)

  const excelColor =
    Number(item.proveedor_importacion_id) === PROVEEDOR_CONFECCIONES_KYLY
      ? resolveImagenColorExcel638(item)
      : String(item.color_nombre ?? '').trim() ||
        (item.ppd_color_codigo != null ? String(item.ppd_color_codigo).trim() : '')

  const chain = useMemo(() => {
    if (candidatesProp?.length) return candidatesProp
    return productImageCandidates(linea, referencia, material, color, variant, {
      proveedorImportacionId: item.proveedor_importacion_id,
      imagenColorExcel: excelColor || undefined,
    })
  }, [
    candidatesProp,
    linea,
    referencia,
    material,
    color,
    variant,
    item.proveedor_importacion_id,
    excelColor,
  ])

  const activeSrc = chain[idx] ?? null
  const isHero = variant === 'hero'

  const handleError = () => {
    if (idx + 1 < chain.length) {
      setIdx(i => i + 1)
      return
    }
    setFailed(true)
  }

  if (failed || !activeSrc) {
    const filename = chain[0]?.split('/').pop() ?? `${linea}-${referencia}.jpg`
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-white ${className}`}
        style={productImageFallbackStyle()}
      >
        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-[8px] font-mono text-slate-400 text-center px-2 break-all">{filename}</p>
      </div>
    )
  }

  if (isHero) {
    return (
      <div className={`cadena-hero-frame ${className}`.trim()} data-hero-frame="bazzar-web">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleError}
        />
      </div>
    )
  }

  return (
    <div className={`cadena-thumb-frame ${className}`.trim()} style={productImageFallbackStyle()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${activeSrc}|${idx}`}
        src={activeSrc}
        alt={alt}
        className="block max-h-full max-w-full h-auto w-auto object-contain object-center bg-white/95"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleError}
      />
    </div>
  )
}
