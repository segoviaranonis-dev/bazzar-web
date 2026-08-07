'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ImagenPortada from '@/components/ImagenPortada'

const SLIDES = [
  {
    marca:   'VIZZANO',
    tagline: 'Elegancia que marca la diferencia',
    sub:     'Diseño italiano para la mujer moderna',
    bg:      'linear-gradient(120deg, #0A0A0A 0%, #1C1209 60%, #2D2000 100%)',
    href:    '/catalogo?marca=VIZZANO',
  },
  {
    marca:   'MOLECA',
    tagline: 'Color, actitud y tendencia',
    sub:     'Moda vibrante para cada momento',
    bg:      'linear-gradient(120deg, #1A0010 0%, #4A0828 60%, #8A2050 100%)',
    href:    '/catalogo?marca=MOLECA',
  },
  {
    marca:   'MODARE',
    tagline: 'Sofisticación atemporal',
    sub:     'Clásicos modernos que nunca pasan de moda',
    bg:      'linear-gradient(120deg, #0F0A06 0%, #2C1F14 60%, #4A3428 100%)',
    href:    '/catalogo?marca=MODARE',
  },
  {
    marca:   'BEIRA RIO',
    tagline: 'Confort sin comprometer el estilo',
    sub:     'Cada paso, una experiencia',
    bg:      'linear-gradient(120deg, #050A14 0%, #0D1F3C 60%, #1A3660 100%)',
    href:    '/catalogo?marca=BEIRA+RIO',
  },
]

export default function HeroSlider() {
  const [current, setCurrent]   = useState(0)
  const [animating, setAnimating] = useState(false)

  const goTo = useCallback((idx: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setCurrent(idx); setAnimating(false) }, 400)
  }, [animating])

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo])
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo])

  useEffect(() => {
    const t = setTimeout(next, 5500)
    return () => clearTimeout(t)
  }, [current, next])

  const slide = SLIDES[current]

  return (
    /* Ratio cinematográfico 21:9 aprox — full-width */
    <div className="relative w-full overflow-hidden select-none"
         style={{ aspectRatio: '21/9', minHeight: 320, background: slide.bg, transition: 'background 0.8s ease' }}>

      {/* Imagen de portada (Storage holding) */}
      <ImagenPortada
        marca={slide.marca}
        tier="lg"
        fit="cover"
        className="absolute inset-0 z-0 h-full w-full"
        alt={`Portada ${slide.marca}`}
      />
      {/* Overlay más liviano para que se vea la foto */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
           style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.08) 100%)' }} />

      {/* Contenido */}
      <div className={`relative z-10 h-full flex flex-col justify-end px-12 md:px-20 pb-12 md:pb-16
                       transition-all duration-400 ${animating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>

        {/* Index */}
        <p className="text-[11px] tracking-[0.3em] uppercase mb-4 font-medium"
           style={{ color: 'rgba(255,255,255,0.35)' }}>
          {String(current + 1).padStart(2,'0')} — {String(SLIDES.length).padStart(2,'0')}
        </p>

        {/* Marca — serif grande */}
        <h2 className="font-serif font-bold leading-none mb-3"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', color: 'white' }}>
          {slide.marca}
        </h2>

        {/* Tagline */}
        <p className="text-sm md:text-base mb-1 font-light tracking-wide"
           style={{ color: 'rgba(255,255,255,0.7)' }}>
          {slide.tagline}
        </p>
        <p className="text-xs md:text-sm mb-8"
           style={{ color: 'rgba(255,255,255,0.4)' }}>
          {slide.sub}
        </p>

        {/* CTAs minimalistas — sin border-radius pronunciado */}
        <div className="flex flex-wrap gap-3">
          <Link href={slide.href}
            className="inline-block bg-white text-black text-xs font-semibold uppercase tracking-widest px-7 py-3 hover:bg-gray-100 transition-colors">
            Ver colección
          </Link>
          <Link href="/catalogo"
            className="inline-block text-xs font-semibold uppercase tracking-widest px-7 py-3 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' }}>
            Catálogo
          </Link>
        </div>
      </div>

      {/* Flechas */}
      <button onClick={prev}
        className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center transition-colors"
        style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
        aria-label="Anterior">
        ‹
      </button>
      <button onClick={next}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center transition-colors"
        style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
        aria-label="Siguiente">
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 right-12 md:right-20 z-20 flex gap-2 items-center">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i+1}`}
            className="block rounded-full transition-all duration-300"
            style={{
              width:  i === current ? 20 : 6,
              height: 6,
              background: i === current ? 'white' : 'rgba(255,255,255,0.3)',
            }} />
        ))}
      </div>
    </div>
  )
}
