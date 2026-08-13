'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GENERO_NAV, hrefGenero } from '@/lib/nav/header-nav'
import type { GeneroMegaFacet } from '@/lib/nav/genero-mega-types'
import {
  imagenPortadaCandidates,
  objectPositionPortadaMega,
} from '@/lib/imagen-portada'
import { fetchGeneroMega, peekGeneroMega } from '@/lib/nav/mega-nav-cache'

type Props = {
  open: boolean
  onClose: () => void
  generoId?: number
  label?: string
}

const empty = (gid: number, label: string): GeneroMegaFacet => ({
  genero_id: gid,
  genero_label: label,
  marcas: [],
  estilos: [],
  estilosPorMarca: {},
  portada: {
    marcas: [],
    href: hrefGenero({ genero_id: gid }),
    candidates: [],
    objectPosition: 'center center',
    ctaLabel: 'Comprar todo',
  },
})

/**
 * 3 paneles: Marcas · Estilos · Portada por género
 * (BR SPORT solo Caballeros · Vizzano Damas · Molekinha/Milon Niñas · Molekinho/Kyly Niños)
 */
export default function MegaMenuGenero({
  open,
  onClose,
  generoId = GENERO_NAV.damas.id,
  label = GENERO_NAV.damas.label,
}: Props) {
  const [data, setData] = useState(() => {
    const hit = peekGeneroMega(generoId)
    return hit
      ? {
          genero_id: hit.genero_id ?? generoId,
          genero_label: hit.genero_label ?? label,
          marcas: hit.marcas ?? [],
          estilos: hit.estilos ?? [],
          estilosPorMarca: hit.estilosPorMarca ?? {},
          portada: hit.portada ?? empty(generoId, label).portada,
        }
      : empty(generoId, label)
  })
  const [loading, setLoading] = useState(() => !peekGeneroMega(generoId))
  const [marcaActiva, setMarcaActiva] = useState<string | null>(() => {
    const hit = peekGeneroMega(generoId)
    return hit?.marcas?.[0] ?? null
  })
  const [slideIdx, setSlideIdx] = useState(0)
  const [candIdx, setCandIdx] = useState(0)

  const applyFacet = useCallback(
    (json: GeneroMegaFacet) => {
      const marcas = json.marcas ?? []
      setData({
        genero_id: json.genero_id ?? generoId,
        genero_label: json.genero_label ?? label,
        marcas,
        estilos: json.estilos ?? [],
        estilosPorMarca: json.estilosPorMarca ?? {},
        portada: json.portada ?? empty(generoId, label).portada,
      })
      setMarcaActiva((prev) =>
        prev && marcas.includes(prev) ? prev : (marcas[0] ?? null),
      )
      setSlideIdx(0)
      setCandIdx(0)
    },
    [generoId, label],
  )

  useEffect(() => {
    const hit = peekGeneroMega(generoId)
    if (hit) {
      applyFacet(hit)
      setLoading(false)
    } else {
      setData(empty(generoId, label))
      setMarcaActiva(null)
      setSlideIdx(0)
      setCandIdx(0)
    }
  }, [generoId, label, applyFacet])

  const load = useCallback(async () => {
    if (!peekGeneroMega(generoId)) setLoading(true)
    const json = await fetchGeneroMega(generoId)
    if (json) applyFacet(json)
    setLoading(false)
  }, [generoId, applyFacet])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const slides = useMemo(() => {
    const marcas =
      data.portada.marcas?.length > 0
        ? data.portada.marcas
        : data.portada.candidates?.length
          ? ['Portada']
          : []
    return marcas.map((m) => ({
      marca: m,
      href: hrefGenero({ genero_id: generoId, marca: m === 'Portada' ? null : m }),
      candidates:
        m === 'Portada'
          ? data.portada.candidates
          : imagenPortadaCandidates(m, 'lg'),
      objectPosition:
        m === 'Portada'
          ? data.portada.objectPosition
          : objectPositionPortadaMega(m),
    }))
  }, [data.portada, generoId])

  const slide = slides[slideIdx] ?? slides[0]
  const portadaSrc = slide?.candidates[candIdx] ?? slide?.candidates[0]

  const estilosVisibles = useMemo(() => {
    if (marcaActiva && data.estilosPorMarca[marcaActiva]?.length) {
      return data.estilosPorMarca[marcaActiva]
    }
    return data.estilos.map((e) => e.nombre)
  }, [marcaActiva, data.estilosPorMarca, data.estilos])

  if (!open) return null

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 border-b border-neutral-200 bg-white shadow-lg"
      onMouseLeave={onClose}
      role="dialog"
      aria-label={`Menú ${label}`}
    >
      <div className="mx-auto grid min-h-[320px] max-w-[1440px] grid-cols-1 md:grid-cols-[220px_minmax(280px,1fr)_300px]">
        <aside className="border-b border-neutral-100 bg-neutral-50/90 px-6 py-8 md:border-b-0 md:border-r">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Marcas{loading ? '…' : ''}
          </p>
          {loading && data.marcas.length === 0 ? (
            <p className="text-sm text-neutral-400">Cargando…</p>
          ) : data.marcas.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin marcas</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.marcas.map((m) => {
                const on = marcaActiva === m
                return (
                  <li key={m}>
                    <button
                      type="button"
                      onMouseEnter={() => setMarcaActiva(m)}
                      onFocus={() => setMarcaActiva(m)}
                      onClick={() => setMarcaActiva(m)}
                      className={`block w-full text-left text-[14px] tracking-wide transition ${
                        on
                          ? 'font-medium text-neutral-950 underline underline-offset-[6px]'
                          : 'text-neutral-600 hover:text-neutral-950'
                      }`}
                    >
                      {m}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            href={hrefGenero({ genero_id: generoId })}
            onClick={onClose}
            className="mt-10 inline-block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-950 underline underline-offset-4"
          >
            Ver todo {label.toLowerCase()}
          </Link>
        </aside>

        <div className="border-b border-neutral-100 px-8 py-8 md:border-b-0 md:border-r">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Estilos
            {marcaActiva ? (
              <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                · {marcaActiva}
              </span>
            ) : null}
          </p>
          {loading && estilosVisibles.length === 0 ? (
            <p className="text-sm text-neutral-400">Cargando…</p>
          ) : estilosVisibles.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin estilos</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {estilosVisibles.map((nombre) => (
                <li key={nombre}>
                  <Link
                    href={hrefGenero({
                      genero_id: generoId,
                      marca: marcaActiva,
                      grupo_estilo: nombre,
                    })}
                    onClick={onClose}
                    className="text-[14px] capitalize text-neutral-700 transition hover:text-neutral-950"
                  >
                    {nombre.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {marcaActiva ? (
            <Link
              href={hrefGenero({ genero_id: generoId, marca: marcaActiva })}
              onClick={onClose}
              className="mt-10 inline-block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-950 underline underline-offset-4"
            >
              Ver {marcaActiva}
            </Link>
          ) : null}
        </div>

        <div className="px-6 py-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Destacado
            </p>
            {slides.length > 1 ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={() => {
                    setSlideIdx((i) => (i <= 0 ? slides.length - 1 : i - 1))
                    setCandIdx(0)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Siguiente"
                  onClick={() => {
                    setSlideIdx((i) => (i >= slides.length - 1 ? 0 : i + 1))
                    setCandIdx(0)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>

          <Link
            href={slide?.href ?? data.portada.href}
            onClick={onClose}
            className="group block"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
              {portadaSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portadaSrc}
                  alt={`Portada ${slide?.marca ?? label}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  style={{ objectPosition: slide?.objectPosition }}
                  onError={() => {
                    if (!slide) return
                    if (candIdx + 1 < slide.candidates.length) {
                      setCandIdx((i) => i + 1)
                    }
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                  {slide?.marca ?? label}
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-950 underline underline-offset-4">
              {data.portada.ctaLabel}
            </p>
            <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-neutral-400">
              {slide?.marca ?? ''} · {label.toLowerCase()}
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
