'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ImagenPortada from '@/components/ImagenPortada'

const SLIDES = [
  {
    marca: 'VIZZANO',
    line: 'Elegancia italiana',
    href: '/catalogo?marca=VIZZANO',
  },
  {
    marca: 'MOLECA',
    line: 'Color y actitud',
    href: '/catalogo?marca=MOLECA',
  },
  {
    marca: 'MODARE',
    line: 'Confort sofisticado',
    href: '/catalogo?marca=MODARE',
  },
  {
    marca: 'BEIRA RIO',
    line: 'Estilo en cada paso',
    href: '/catalogo?marca=BEIRA+RIO',
  },
]

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [fade, setFade] = useState(true)

  const goTo = useCallback(
    (idx: number) => {
      if (idx === current) return
      setFade(false)
      window.setTimeout(() => {
        setCurrent(idx)
        setFade(true)
      }, 280)
    },
    [current],
  )

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo])
  const prev = useCallback(
    () => goTo((current - 1 + SLIDES.length) % SLIDES.length),
    [current, goTo],
  )

  useEffect(() => {
    const t = window.setTimeout(next, 6500)
    return () => window.clearTimeout(t)
  }, [current, next])

  const slide = SLIDES[current]

  return (
    <section
      className="relative w-full overflow-hidden bg-neutral-950 select-none"
      style={{ height: 'min(78vh, 820px)', minHeight: 420 }}
      aria-roledescription="carrusel"
      aria-label="Campañas de marca"
    >
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ opacity: fade ? 1 : 0 }}
      >
        <ImagenPortada
          marca={slide.marca}
          tier="lg"
          fit="cover"
          className="absolute inset-0 h-full w-full"
          alt=""
        />
      </div>

      {/* Velo inferior — deja respirar la foto arriba */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* Primer viewport: marca (discreta) · una línea · un CTA */}
      <div
        className="relative z-10 flex h-full flex-col justify-end px-6 pb-10 md:px-14 md:pb-14 lg:px-20"
        style={{
          opacity: fade ? 1 : 0,
          transform: fade ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}
      >
        <p className="mb-3 font-serif text-[11px] uppercase tracking-[0.35em] text-white/55">
          bazzar · {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </p>
        <p className="max-w-xl font-serif text-2xl font-medium leading-snug text-white md:text-4xl md:leading-tight">
          {slide.line}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href={slide.href}
            className="inline-flex items-center bg-white px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-950 transition hover:bg-neutral-100"
          >
            Ver colección
          </Link>
          <Link
            href="/catalogo"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 underline-offset-4 transition hover:text-white hover:underline"
          >
            Ir al catálogo
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={prev}
        className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 text-xl text-white/80 transition hover:border-white/60 hover:text-white md:flex"
        aria-label="Anterior"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 text-xl text-white/80 transition hover:border-white/60 hover:text-white md:flex"
        aria-label="Siguiente"
      >
        ›
      </button>

      <div className="absolute bottom-6 right-6 z-20 flex gap-2 md:right-14">
        {SLIDES.map((s, i) => (
          <button
            key={s.marca}
            type="button"
            onClick={() => goTo(i)}
            aria-label={s.marca}
            aria-current={i === current ? 'true' : undefined}
            className="h-[3px] transition-all duration-300"
            style={{
              width: i === current ? 28 : 10,
              background: i === current ? '#fff' : 'rgba(255,255,255,0.35)',
            }}
          />
        ))}
      </div>
    </section>
  )
}
