'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CartButton } from '@/lib/cart/CartDrawer'

export interface HeaderData {
  /** Solo local :3002 — Estadísticas de Stock (no deploy) */
  showAuditoriaLocal?: boolean
}

/** Cabecera ops · hermanos siameses (sin mega-menú moda / sin banner). */
export default function Header({ data }: { data: HeaderData }) {
  const pathname = usePathname()
  const enInicio = pathname === '/' || pathname?.startsWith('/inicio')
  const enCatalogo = pathname?.startsWith('/catalogo')

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/inicio"
            prefetch
            className="shrink-0 font-serif text-[1.35rem] font-medium tracking-[0.04em] text-neutral-950"
            aria-label="Inicio · portada"
          >
            bazzar
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Navegación">
            <NavLink href="/inicio" active={enInicio} prefetch>
              Inicio
            </NavLink>
            <NavLink href="/catalogo" active={enCatalogo} prefetch>
              Catálogo
            </NavLink>
            {data.showAuditoriaLocal ? (
              <NavLink
                href="/auditoria-local"
                active={pathname?.startsWith('/auditoria-local')}
                title="Solo local · no deploy"
              >
                Estadísticas
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SearchBar />
          <CartButton />
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  children,
  title,
  prefetch = true,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
  title?: string
  prefetch?: boolean
}) {
  return (
    <Link
      href={href}
      title={title}
      prefetch={prefetch}
      className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? 'bg-neutral-950 text-white'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950'
      }`}
    >
      {children}
    </Link>
  )
}

function SearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ tipo: string; label: string; href: string }[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(v), 280)
  }

  const close = () => {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 hover:text-[#1E3A5F]"
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
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (query.trim()) {
            router.push(`/catalogo?q=${encodeURIComponent(query.trim())}`)
            close()
          }
        }}
        className="flex items-center gap-2"
      >
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="L-R-M-C · marca · estilo…"
          className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 sm:w-56"
        />
        <button
          type="button"
          onClick={close}
          className="text-lg leading-none text-slate-400 hover:text-slate-800"
        >
          ×
        </button>
      </form>

      {(results.length > 0 || loading) && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          {loading && <p className="px-4 py-3 text-xs text-slate-400">Buscando…</p>}
          {results.map((r, i) => (
            <Link
              key={i}
              href={r.href}
              onClick={close}
              className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50"
            >
              <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-slate-400">
                {r.tipo}
              </span>
              <span className="text-sm text-slate-800">{r.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
