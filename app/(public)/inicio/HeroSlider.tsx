'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import ImagenPortada from '@/components/ImagenPortada'

/**
 * Portadas oficiales son panorámicas (~2.8:1) en desktop.
 * Móvil: altura mínima generosa + swipe/dots táctiles.
 */
/** Hero: calzado premium + confecciones Kyly/Milon (portadas 2026-08-11) */
const SLIDES = [
  {
    marca: 'VIZZANO',
    line: 'Elegancia italiana',
    href: '/catalogo?marca=VIZZANO',
  },
  {
    marca: 'BEIRA RIO',
    line: 'Estilo en cada paso',
    href: '/catalogo?marca=BEIRA+RIO',
  },
  {
    marca: 'MODARE',
    line: 'Confort sofisticado',
    href: '/catalogo?marca=MODARE',
  },
  {
    marca: 'KYLY',
    line: 'Confecciones infantiles',
    href: '/catalogo?marca=KYLY',
  },
  {
    marca: 'MILON',
    line: 'Estilo para peques',
    href: '/catalogo?marca=MILON',
  },
]

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [fade, setFade] = useState(true)
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback(
    (idx: number) => {
      if (idx === current) return
      setFade(false)
      window.setTimeout(() => {
        setCurrent(idx)
        setFade(true)
      }, 220)
    },
    [current],
  )

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo])
  const prev = useCallback(
    () => goTo((current - 1 + SLIDES.length) % SLIDES.length),
    [current, goTo],
  )

  useEffect(() => {
    const t = window.setTimeout(next, 7000)
    return () => window.clearTimeout(t)
  }, [current, next])

  const slide = SLIDES[current]

  return (
    <section
      className="relative w-full bg-neutral-950 select-none"
      aria-roledescription="carrusel"
      aria-label="Campañas de marca"
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        if (start == null) return
        const end = e.changedTouches[0]?.clientX ?? start
        const delta = end - start
        touchStartX.current = null
        if (Math.abs(delta) < 48) return
        if (delta < 0) next()
        else prev()
      }}
    >
      <div className="relative w-full min-h-[42vh] overflow-hidden md:aspect-[2.83/1] md:min-h-[220px]">
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: fade ? 1 : 0 }}
        >
          <ImagenPortada
            marca={slide.marca}
            tier="lg"
            fit="cover"
            className="absolute inset-0 h-full w-full"
            alt={`Campaña ${slide.marca}`}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 42%, rgba(0,0,0,0.05) 100%), linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.45) 100%)',
          }}
        />

        <div
          className="absolute inset-0 z-10 flex flex-col justify-end px-5 pb-8 md:px-12 md:pb-10 lg:px-16"
          style={{
            opacity: fade ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.35em] text-white/50 md:text-[11px]">
            {slide.marca}
          </p>
          <p className="max-w-lg font-serif text-2xl font-medium leading-snug text-white md:text-3xl lg:text-4xl">
            {slide.line}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href={slide.href}
              className="inline-flex min-h-11 items-center bg-white px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-950 transition hover:bg-neutral-100"
            >
              Ver colección
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex min-h-11 items-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75 underline-offset-4 hover:text-white hover:underline"
            >
              Catálogo
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={prev}
          className="touch-target absolute left-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center border border-white/30 bg-black/20 text-lg text-white/90 backdrop-blur-sm transition hover:border-white hover:text-white md:left-3"
          aria-label="Anterior"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={next}
          className="touch-target absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center border border-white/30 bg-black/20 text-lg text-white/90 backdrop-blur-sm transition hover:border-white hover:text-white md:right-3"
          aria-label="Siguiente"
        >
          ›
        </button>

        <div className="absolute bottom-4 right-4 z-20 flex gap-1 md:bottom-5 md:right-12">
          {SLIDES.map((s, i) => (
            <button
              key={s.marca}
              type="button"
              onClick={() => goTo(i)}
              aria-label={s.marca}
              aria-current={i === current ? 'true' : undefined}
              className="touch-target flex items-center justify-center"
            >
              <span
                className="block h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 24 : 10,
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
