'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CATALOGO_SEARCH_ARIA,
  CATALOGO_SEARCH_PLACEHOLDER,
  type CatalogoSearchHit,
} from '@/lib/catalogo/busqueda-catalogo'

type Variant = 'header' | 'sidebar'

type Props = {
  variant: Variant
  /** Sidebar: aplica `q` preservando resto de filtros. Header: navega a /catalogo?q= */
  onApplyQ?: (q: string) => void
}

/**
 * Campo único header ↔ sidebar (placeholder, autocomplete, Enter → ?q=).
 */
export function CatalogoSearchField({ variant, onApplyQ }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qUrl = searchParams.get('q') ?? ''

  const [open, setOpen] = useState(variant === 'sidebar')
  const [query, setQuery] = useState(qUrl)
  const [results, setResults] = useState<CatalogoSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(qUrl)
  }, [qUrl])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      const data = (await res.json()) as { results?: CatalogoSearchHit[] }
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(v), 280)
  }

  const applyQ = (raw: string) => {
    const q = raw.trim()
    if (onApplyQ) {
      onApplyQ(q)
    } else {
      const p = new URLSearchParams()
      if (q) p.set('q', q)
      router.push(q ? `/catalogo?${p.toString()}` : '/catalogo')
    }
    setResults([])
    if (variant === 'header') {
      setOpen(false)
      setQuery('')
    }
  }

  const closeHeader = () => {
    setOpen(false)
    setQuery(qUrl)
    setResults([])
  }

  const inputClass =
    variant === 'header'
      ? 'w-44 border-0 border-b border-neutral-300 bg-transparent px-1 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-950 focus:outline-none sm:w-56'
      : 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20'

  if (variant === 'header' && !open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setQuery(qUrl)
        }}
        aria-label={CATALOGO_SEARCH_ARIA}
        className="p-2 text-neutral-800 transition hover:text-neutral-950"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
      </button>
    )
  }

  return (
    <div className={variant === 'sidebar' ? 'relative block space-y-1' : 'relative'}>
      {variant === 'sidebar' ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Buscar
        </span>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          applyQ(query)
        }}
        className={variant === 'header' ? 'flex items-center gap-2' : 'block'}
      >
        <input
          autoFocus={variant === 'header'}
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => {
            if (variant !== 'sidebar') return
            // Diferir: permite click en sugerencia antes de aplicar q
            window.setTimeout(() => {
              if (query !== qUrl) applyQ(query)
            }, 180)
          }}
          placeholder={CATALOGO_SEARCH_PLACEHOLDER}
          aria-label={CATALOGO_SEARCH_ARIA}
          className={inputClass}
        />
        {variant === 'header' ? (
          <button
            type="button"
            onClick={closeHeader}
            className="text-lg leading-none text-neutral-400 hover:text-neutral-800"
            aria-label="Cerrar búsqueda"
          >
            ×
          </button>
        ) : null}
      </form>

      {(results.length > 0 || loading) && (
        <div
          className={`absolute z-50 mt-2 border border-neutral-200 bg-white py-2 shadow-lg ${
            variant === 'header' ? 'right-0 w-72' : 'left-0 right-0 w-full'
          }`}
        >
          {loading && <p className="px-4 py-3 text-xs text-neutral-400">Buscando…</p>}
          {results.map((r, i) => (
            <Link
              key={`${r.tipo}-${r.label}-${i}`}
              href={r.href}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setResults([])
                if (variant === 'header') closeHeader()
              }}
              className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-neutral-50"
            >
              <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-neutral-400">
                {r.tipo}
              </span>
              <span className="text-sm text-neutral-800">{r.label}</span>
            </Link>
          ))}
          {query.trim() ? (
            <button
              type="button"
              onClick={() => applyQ(query)}
              className="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-2.5 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Buscar «{query.trim()}» en catálogo
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
