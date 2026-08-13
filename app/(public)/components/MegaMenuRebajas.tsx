'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { hrefRebajas } from '@/lib/nav/header-nav'
import type { RebajasMegaFacet } from '@/lib/nav/rebajas-mega-types'
import { fetchRebajasMega, peekRebajasMega } from '@/lib/nav/mega-nav-cache'

type Props = {
  open: boolean
  onClose: () => void
}

const empty: RebajasMegaFacet = {
  generos: [],
  marcas: [],
  estilos: [],
  portada: {
    marca: 'BR SPORT',
    href: '/catalogo?tipo_grupos=liquidacion&marca=BR+SPORT',
    candidates: [],
    objectPosition: 'center center',
    ctaLabel: 'Comprar todo',
  },
}

function facetFrom(json: RebajasMegaFacet): RebajasMegaFacet {
  return {
    generos: json.generos ?? [],
    marcas: json.marcas ?? [],
    estilos: json.estilos ?? [],
    portada: json.portada ?? empty.portada,
  }
}

export default function MegaMenuRebajas({ open, onClose }: Props) {
  const [generoId, setGeneroId] = useState<number | null>(null)
  const [data, setData] = useState<RebajasMegaFacet>(() => {
    const hit = peekRebajasMega()
    return hit ? facetFrom(hit) : empty
  })
  const [loading, setLoading] = useState(() => !peekRebajasMega())
  const [imgIdx, setImgIdx] = useState(0)

  const load = useCallback(async (gid: number | null) => {
    if (gid == null || gid <= 0) {
      const hit = peekRebajasMega()
      if (hit) {
        setData(facetFrom(hit))
        setLoading(false)
      } else {
        setLoading(true)
      }
    } else {
      setLoading(true)
    }
    const json = await fetchRebajasMega(gid)
    if (json) {
      setData(facetFrom(json))
      setImgIdx(0)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    void load(generoId)
  }, [open, generoId, load])

  if (!open) return null

  const portadaSrc = data.portada.candidates[imgIdx] ?? data.portada.candidates[0]
  const mid = Math.ceil(data.marcas.length / 2) || 0
  const marcasColA = data.marcas.slice(0, mid)
  const marcasColB = data.marcas.slice(mid)

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 border-b border-neutral-200 bg-white shadow-lg"
      onMouseLeave={onClose}
      role="dialog"
      aria-label="Menú Rebajas"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 md:grid-cols-[200px_1fr_280px] lg:grid-cols-[220px_1fr_320px]">
        {/* Panel 1 — Géneros */}
        <aside className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-8 md:border-b-0 md:border-r">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Género
          </p>
          <ul className="space-y-3">
            <li>
              <button
                type="button"
                onClick={() => setGeneroId(null)}
                className={`text-left text-[13px] transition ${
                  generoId == null
                    ? 'font-medium text-neutral-950 underline underline-offset-4'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                Todos
              </button>
            </li>
            {data.generos.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setGeneroId(g.id)}
                  className={`text-left text-[13px] capitalize transition ${
                    generoId === g.id
                      ? 'font-medium text-neutral-950 underline underline-offset-4'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  {g.nombre.toLowerCase()}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Panel 2 — Marcas */}
        <div className="px-8 py-8">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Marcas{loading ? '…' : ''}
          </p>
          {data.marcas.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin marcas en rebajas</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-10 gap-y-2.5">
              <ul className="space-y-2.5">
                {marcasColA.map((m) => (
                  <li key={m}>
                    <Link
                      href={hrefRebajas({ genero_id: generoId, marca: m })}
                      onClick={onClose}
                      className="text-[13px] text-neutral-700 transition hover:text-neutral-950"
                    >
                      {m}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2.5">
                {marcasColB.map((m) => (
                  <li key={m}>
                    <Link
                      href={hrefRebajas({ genero_id: generoId, marca: m })}
                      onClick={onClose}
                      className="text-[13px] text-neutral-700 transition hover:text-neutral-950"
                    >
                      {m}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href={hrefRebajas({ genero_id: generoId })}
            onClick={onClose}
            className="mt-8 inline-block text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-950 underline underline-offset-4"
          >
            Ver todas las rebajas
          </Link>
        </div>

        {/* Panel 3 — Estilos + portada BR Sport */}
        <div className="border-t border-neutral-100 px-6 py-8 md:border-l md:border-t-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Estilos
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

          <ul className="mb-5 space-y-2">
            {data.estilos.length === 0 ? (
              <li className="text-sm text-neutral-400">Sin estilos</li>
            ) : (
              data.estilos.map((e) => (
                <li key={e.nombre}>
                  <Link
                    href={hrefRebajas({
                      genero_id: generoId,
                      grupo_estilo: e.nombre,
                    })}
                    onClick={onClose}
                    className="text-[13px] capitalize text-neutral-700 transition hover:text-neutral-950"
                  >
                    {e.nombre.toLowerCase()}
                  </Link>
                </li>
              ))
            )}
          </ul>

          <Link
            href={data.portada.href}
            onClick={onClose}
            className="group block"
          >
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
              BR Sport · rebajas
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
