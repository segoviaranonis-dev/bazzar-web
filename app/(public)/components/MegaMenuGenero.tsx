'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GENERO_NAV, hrefGenero } from '@/lib/nav/header-nav'
import type { GeneroMegaFacet } from '@/lib/nav/genero-mega-types'

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
    marca: 'BR SPORT',
    href: hrefGenero({ genero_id: gid, marca: 'BR SPORT' }),
    candidates: [],
    objectPosition: 'center center',
    ctaLabel: 'Comprar todo',
  },
})

/**
 * 3 paneles fijos (siempre visibles en desktop):
 * 1 Marcas vertical · 2 Estilos de la marca · 3 Portada BR Sport
 */
export default function MegaMenuGenero({
  open,
  onClose,
  generoId = GENERO_NAV.caballeros.id,
  label = GENERO_NAV.caballeros.label,
}: Props) {
  const [data, setData] = useState(() => empty(generoId, label))
  const [loading, setLoading] = useState(false)
  const [marcaActiva, setMarcaActiva] = useState<string | null>(null)
  const [imgIdx, setImgIdx] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/nav/genero?genero_id=${generoId}`)
      const json = (await res.json()) as GeneroMegaFacet & { ok?: boolean }
      if (json?.ok === false) return
      const marcas = json.marcas ?? []
      setData({
        genero_id: json.genero_id ?? generoId,
        genero_label: json.genero_label ?? label,
        marcas,
        estilos: json.estilos ?? [],
        estilosPorMarca: json.estilosPorMarca ?? {},
        portada: json.portada ?? empty(generoId, label).portada,
      })
      // Primera marca (ACTVITTA / BR SPORT) para panel estilos
      setMarcaActiva(marcas[0] ?? null)
      setImgIdx(0)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [generoId, label])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const estilosVisibles = useMemo(() => {
    if (marcaActiva && data.estilosPorMarca[marcaActiva]?.length) {
      return data.estilosPorMarca[marcaActiva]
    }
    return data.estilos.map((e) => e.nombre)
  }, [marcaActiva, data.estilosPorMarca, data.estilos])

  if (!open) return null

  const portadaSrc = data.portada.candidates[imgIdx] ?? data.portada.candidates[0]

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 border-b border-neutral-200 bg-white shadow-lg"
      onMouseLeave={onClose}
      role="dialog"
      aria-label={`Menú ${label}`}
    >
      {/* 3 columnas siempre en md+ · panel marcas estrecho vertical */}
      <div className="mx-auto grid min-h-[320px] max-w-[1440px] grid-cols-1 md:grid-cols-[220px_minmax(280px,1fr)_300px]">
        {/* Panel 1 — Marcas vertical */}
        <aside className="border-b border-neutral-100 bg-neutral-50/90 px-6 py-8 md:border-b-0 md:border-r">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Marcas{loading ? '…' : ''}
          </p>
          {data.marcas.length === 0 ? (
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

        {/* Panel 2 — Estilos de la marca (vertical) */}
        <div className="border-b border-neutral-100 px-8 py-8 md:border-b-0 md:border-r">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Estilos
            {marcaActiva ? (
              <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                · {marcaActiva}
              </span>
            ) : null}
          </p>
          {estilosVisibles.length === 0 ? (
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

        {/* Panel 3 — Portada BR Sport */}
        <div className="px-6 py-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Destacado
            </p>
            {data.portada.candidates.length > 1 ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={() =>
                    setImgIdx((i) =>
                      i <= 0 ? data.portada.candidates.length - 1 : i - 1,
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Siguiente"
                  onClick={() =>
                    setImgIdx((i) =>
                      i >= data.portada.candidates.length - 1 ? 0 : i + 1,
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>

          <Link href={data.portada.href} onClick={onClose} className="group block">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
              {portadaSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portadaSrc}
                  alt="Portada BR SPORT"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  style={{ objectPosition: data.portada.objectPosition }}
                  onError={() =>
                    setImgIdx((i) =>
                      i + 1 < data.portada.candidates.length ? i + 1 : i,
                    )
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                  BR SPORT
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-950 underline underline-offset-4">
              {data.portada.ctaLabel}
            </p>
            <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-neutral-400">
              BR Sport · {label.toLowerCase()}
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
