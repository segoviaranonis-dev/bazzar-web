'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '@/lib/cart/CartContext'

/* ── Tipos ── */
export interface Talla { combinacion_id: number; codigo: string; orden: number; stock: number }

export interface Variante {
  id_color_f9: number
  color_nombre: string
  hex_web: string | null
  imagen_url: string
  tallas: Talla[]
}

export interface ProductoAgrupado {
  key: string
  linea_id: number
  linea_codigo: string
  referencia_id: number
  referencia_codigo: string
  referencia_descripcion: string
  material_descripcion: string
  marca: string
  precio_web: number | null
  descp_grupo_estilo: string | null
  grupo_estilo_id: number | null
  variantes: Variante[]
}

/* ── Paleta ── */
const NAVY   = '#1E3A5F'
const ORANGE = '#F97316'

/* ── Color desde nombre ── */
const COLOR_MAP: [RegExp, string][] = [
  [/negro/i,           '#1a1a1a'],
  [/blanco|off\s?white/i, '#f5f5f0'],
  [/gris\b/i,          '#9e9e9e'],
  [/plata|plateado/i,  '#b0bec5'],
  [/marron|marrón/i,   '#6d4c41'],
  [/cafe|café/i,       '#795548'],
  [/camel/i,           '#c19a6b'],
  [/beige/i,           '#e8d5b0'],
  [/crema/i,           '#f5f0e0'],
  [/nude/i,            '#e8c9a0'],
  [/natural/i,         '#d4b896'],
  [/cuero/i,           '#a0785a'],
  [/azul\b/i,          '#1565c0'],
  [/navy|marino/i,     '#1e3a5f'],
  [/celeste/i,         '#4fc3f7'],
  [/rojo/i,            '#c62828'],
  [/bordo|burdeo/i,    '#880e4f'],
  [/rosado|rosa\b/i,   '#f48fb1'],
  [/coral/i,           '#ff7043'],
  [/salmon|salmón/i,   '#ef9a9a'],
  [/naranja/i,         '#ef6c00'],
  [/amarillo/i,        '#f9a825'],
  [/dorado|oro\b/i,    '#ffd54f'],
  [/verde\b/i,         '#2e7d32'],
  [/oliva|olivo/i,     '#827717'],
  [/violeta/i,         '#7b1fa2'],
  [/morado|lila/i,     '#ab47bc'],
  [/turquesa/i,        '#00897b'],
  [/mostaza/i,         '#c8a227'],
  [/taupe/i,           '#9e8e7e'],
  [/chocolate/i,       '#4e2b0e'],
  [/vison|visón/i,     '#c4a882'],
  [/tabaco/i,          '#8b5e3c'],
]

function hexDesdeNombre(nombre: string): string {
  for (const [re, hex] of COLOR_MAP) {
    if (re.test(nombre)) return hex
  }
  return '#CBD5E1'
}

/* ── Imagen con fallback ── */
function Imagen({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false)

  if (err) {
    // Extraer solo el nombre del archivo de la URL
    const filename = src.split('/').pop() || 'imagen-no-encontrada.jpg'

    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${className ?? 'w-full h-full'}`}
           style={{ backgroundColor: '#f1f5f9', padding: '1rem' }}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"
             style={{ color: '#cbd5e1' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-[9px] font-mono text-center break-all px-2"
           style={{ color: '#94a3b8', lineHeight: '1.2' }}>
          {filename}
        </p>
      </div>
    )
  }

  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt={alt} onError={() => setErr(true)} className={className} style={style} />
}

/* ── Lightbox ── */
function Lightbox({
  producto: p,
  initialIdx,
  onClose,
}: {
  producto: ProductoAgrupado
  initialIdx: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIdx)
  const variante = p.variantes[idx]
  const precio = p.precio_web ? new Intl.NumberFormat('es-PY').format(p.precio_web) : null

  const prev = useCallback(() => setIdx(i => (i - 1 + p.variantes.length) % p.variantes.length), [p.variantes.length])
  const next = useCallback(() => setIdx(i => (i + 1) % p.variantes.length), [p.variantes.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col bg-white rounded-2xl overflow-hidden w-full max-w-lg"
        style={{ maxHeight: '90vh', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen grande */}
        <div className="relative flex-1 min-h-0"
             style={{ background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', minHeight: 320 }}>
          <Imagen
            src={variante.imagen_url}
            alt={`${p.linea_codigo}-${p.referencia_codigo} ${variante.color_nombre}`}
            className="w-full h-full object-contain"
            style={{ maxHeight: 420 } as React.CSSProperties}
          />

          {/* Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center
                       rounded-full bg-white/90 hover:bg-white transition-colors shadow"
            style={{ color: '#64748b' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Flechas */}
          {p.variantes.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                           rounded-full bg-white/90 hover:bg-white shadow transition-colors"
                style={{ color: NAVY }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                           rounded-full bg-white/90 hover:bg-white shadow transition-colors"
                style={{ color: NAVY }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Badge marca */}
          <div className="absolute top-3 left-3">
            <span className="text-white text-[9px] font-extrabold px-2.5 py-1
                             rounded-full uppercase tracking-widest shadow-sm"
                  style={{ backgroundColor: NAVY }}>
              {p.marca}
            </span>
          </div>

          {/* Contador */}
          {p.variantes.length > 1 && (
            <div className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                 style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#475569' }}>
              {idx + 1} / {p.variantes.length}
            </div>
          )}
        </div>

        {/* Info + swatches */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-extrabold" style={{ color: NAVY }}>{p.linea_codigo}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm font-extrabold" style={{ color: ORANGE }}>{p.referencia_codigo}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{p.referencia_descripcion}</p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#475569' }}>
                {variante.color_nombre}
              </p>
            </div>
            {precio && (
              <div className="text-right shrink-0">
                <span className="text-[9px] font-semibold uppercase" style={{ color: '#94a3b8' }}>Gs.</span>
                {' '}
                <span className="text-base font-extrabold" style={{ color: ORANGE }}>{precio}</span>
              </div>
            )}
          </div>

          {/* Swatches */}
          {p.variantes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {p.variantes.map((v, i) => {
                const hex = v.hex_web ?? hexDesdeNombre(v.color_nombre)
                const isActive = i === idx
                return (
                  <button
                    key={v.id_color_f9}
                    onClick={() => setIdx(i)}
                    title={v.color_nombre}
                    style={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: isActive ? `2px solid ${ORANGE}` : '2px solid transparent',
                      outline: isActive ? `2px solid ${ORANGE}40` : '2px solid transparent',
                      outlineOffset: 1,
                      transform: isActive ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Card principal ── */
export function ProductoCard({ producto: p }: { producto: ProductoAgrupado }) {
  const { addItem } = useCart()
  const [varIdx, setVarIdx]           = useState(0)
  const [flash, setFlash]             = useState<string | null>(null)
  const [hoveredTalla, setHoveredTalla] = useState<string | null>(null)
  const [lightbox, setLightbox]       = useState(false)

  const variante   = p.variantes[varIdx]
  const stockTotal = variante.tallas.reduce((s, t) => s + t.stock, 0)
  const precio     = p.precio_web ? new Intl.NumberFormat('es-PY').format(p.precio_web) : null

  function handleAddTalla(talla: Talla) {
    addItem({
      key:                    `${p.key}-${variante.id_color_f9}-${talla.codigo}`,
      combinacion_id:         talla.combinacion_id,
      stock_web:              talla.stock,
      linea_id:               p.linea_id,
      linea_codigo:           p.linea_codigo,
      referencia_id:          p.referencia_id,
      referencia_codigo:      p.referencia_codigo,
      referencia_descripcion: p.referencia_descripcion,
      marca:                  p.marca,
      material_descripcion:   p.material_descripcion,
      color_nombre:           variante.color_nombre,
      talla_codigo:           talla.codigo,
      imagen_url:             variante.imagen_url,
      precio_web:             p.precio_web,
    })
    setFlash(talla.codigo)
    setTimeout(() => setFlash(null), 1000)
  }

  return (
    <>
      <div className="group flex flex-col bg-white overflow-hidden relative"
           style={{
             borderRadius: '16px',
             boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
             transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
             border: 'none',
           }}
           onMouseEnter={e => {
             e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.06)'
             e.currentTarget.style.transform = 'translateY(-4px)'
           }}
           onMouseLeave={e => {
             e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)'
             e.currentTarget.style.transform = 'translateY(0)'
           }}>

        {/* ── Imagen ── */}
        <div
          className="relative aspect-square overflow-hidden cursor-zoom-in bg-[#F8FAFC]"
          onClick={() => setLightbox(true)}
        >
          <Imagen
            src={variante.imagen_url}
            alt={`${p.linea_codigo}-${p.referencia_codigo} ${variante.color_nombre}`}
            className="w-full h-full object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Icono lupa */}
          <div className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center
                          rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity shadow"
               style={{ color: NAVY }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>

          {/* Badge marca */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            <span className="text-white text-[9px] font-extrabold px-2.5 py-1
                             rounded-full uppercase tracking-widest shadow-sm"
                  style={{ backgroundColor: NAVY }}>
              {p.marca}
            </span>
            {p.descp_grupo_estilo && (
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: ORANGE, border: `1px solid ${ORANGE}33` }}>
                {p.descp_grupo_estilo.charAt(0) + p.descp_grupo_estilo.slice(1).toLowerCase()}
              </span>
            )}
          </div>

          {/* Badge colores */}
          {p.variantes.length > 1 && (
            <span className="absolute top-2.5 right-2.5 text-[9px] font-bold
                             px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#475569',
                           boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {p.variantes.length} colores
            </span>
          )}

          {/* Flash "agregado" */}
          {flash && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
                 style={{ backgroundColor: 'rgba(249,115,22,0.92)', backdropFilter: 'blur(2px)' }}>
              <svg className="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-white text-xs font-extrabold tracking-wide">T. {flash} — Agregado</p>
            </div>
          )}

          {/* Sin stock overlay */}
          {stockTotal === 0 && (
            <div className="absolute inset-0 flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(248,250,252,0.8)' }}>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'white', color: '#94a3b8',
                             border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                Sin stock
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 p-3 gap-2">

          {/* Identificador Línea · Referencia */}
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-extrabold tracking-wide" style={{ color: NAVY }}>
                {p.linea_codigo}
              </span>
              <span className="text-slate-300 text-[11px]">·</span>
              <span className="text-[11px] font-extrabold" style={{ color: ORANGE }}>
                {p.referencia_codigo}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {p.material_descripcion} · {variante.color_nombre}
            </p>
          </div>

          {/* Precio + Stock */}
          <div className="flex items-center justify-between">
            {precio ? (
              <div>
                <span className="text-[9px] font-semibold uppercase tracking-wide"
                      style={{ color: '#94a3b8' }}>Gs.</span>
                {' '}
                <span className="text-sm font-extrabold" style={{ color: ORANGE }}>{precio}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Consultar precio</span>
            )}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              {stockTotal} pares
            </span>
          </div>

          {/* Swatches de color */}
          {p.variantes.length > 1 && (
            <div className="flex flex-wrap gap-1 pt-1.5 border-t" style={{ borderColor: '#f1f5f9' }}>
              {p.variantes.map((v, i) => {
                const hex = v.hex_web ?? hexDesdeNombre(v.color_nombre)
                const isActive = i === varIdx
                return (
                  <button
                    key={v.id_color_f9}
                    onClick={() => setVarIdx(i)}
                    title={v.color_nombre}
                    style={{
                      width: 20, height: 20,
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: isActive ? `2px solid ${ORANGE}` : '2px solid transparent',
                      outline: isActive ? `2px solid ${ORANGE}40` : '2px solid transparent',
                      outlineOffset: 1,
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      opacity: isActive ? 1 : 0.75,
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Tallas */}
          <div className="flex flex-wrap gap-1">
            {variante.tallas.map(t => {
              const activa = t.stock > 0
              const hovered = hoveredTalla === t.codigo
              return (
                <button
                  key={t.codigo}
                  disabled={!activa}
                  onClick={() => handleAddTalla(t)}
                  onMouseEnter={() => activa && setHoveredTalla(t.codigo)}
                  onMouseLeave={() => setHoveredTalla(null)}
                  title={activa ? `Agregar T.${t.codigo} al pedido` : 'Sin stock'}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 7px',
                    borderRadius: 7,
                    border: `1px solid ${activa ? (hovered ? ORANGE : '#e2e8f0') : '#f1f5f9'}`,
                    backgroundColor: activa ? (hovered ? ORANGE : '#f8fafc') : '#fafafa',
                    color: activa ? (hovered ? 'white' : NAVY) : '#cbd5e1',
                    cursor: activa ? 'pointer' : 'not-allowed',
                    textDecoration: activa ? 'none' : 'line-through',
                    transition: 'all 0.12s ease',
                    transform: hovered ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {t.codigo}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox
          producto={p}
          initialIdx={varIdx}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  )
}
