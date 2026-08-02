'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CartButton } from '@/lib/cart/CartDrawer'

export interface HeaderData {
  mujeres: { marcas: string[]; estilos: string[] }
  hombres: { marcas: string[]; estilos: string[]; colores: string[] }
  /** Solo local :3002 — Estadísticas de Stock (no deploy) */
  showAuditoriaLocal?: boolean
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// ── Mega panel Mujeres ──────────────────────────────────────────────────────
function MegaMujeres({ data }: { data: HeaderData['mujeres'] }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[560px] bg-white border-t border-gray-200 shadow-xl z-50 py-8 px-10">
      <div className="grid grid-cols-3 gap-8">
        {/* Col 1: Ver todo */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Mujeres</p>
          <Link href="/catalogo"
            className="block text-sm text-gray-800 hover:text-black transition-colors py-1 font-medium">
            Ver todo
          </Link>
        </div>

        {/* Col 2: Marcas desde DB */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Marcas</p>
          <ul className="space-y-2.5">
            {data.marcas.map(m => (
              <li key={m}>
                <Link href={`/catalogo?marca=${encodeURIComponent(m)}`}
                  className="text-sm text-gray-800 hover:text-black transition-colors">
                  {cap(m)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Estilos desde DB */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Estilos</p>
          <ul className="space-y-2.5">
            {data.estilos.slice(0, 9).map(e => (
              <li key={e}>
                <Link href={`/catalogo?grupo_estilo=${encodeURIComponent(e)}`}
                  className="text-sm text-gray-800 hover:text-black transition-colors">
                  {cap(e)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ── Mega panel Niños ────────────────────────────────────────────────────────
function MegaNinos() {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[320px] bg-white border-t border-gray-200 shadow-xl z-50 py-8 px-10">
      <div className="grid grid-cols-2 gap-8">
        {[
          { label: 'Molekinha', marca: 'MOLEKINHA', sub: 'Niñas' },
          { label: 'Molekinho', marca: 'MOLEKINHO', sub: 'Niños' },
        ].map(({ label, marca, sub }) => (
          <div key={marca}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">{sub}</p>
            <Link href={`/catalogo?marca=${marca}`}
              className="block text-sm font-medium text-gray-800 hover:text-black transition-colors py-1">
              {label}
            </Link>
            <Link href={`/catalogo?marca=${marca}`}
              className="block text-xs text-gray-400 hover:text-black transition-colors mt-2">
              Ver colección →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mega panel Hombres ──────────────────────────────────────────────────────
function MegaHombres({ data }: { data: HeaderData['hombres'] }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border-t border-gray-200 shadow-xl z-50 py-8 px-10"
         style={{ width: Math.min(200 + data.colores.length * 8, 680) + 'px', minWidth: 480 }}>
      <div className={`grid gap-8 ${data.colores.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>

        {/* Ver todo */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Hombres</p>
          <Link href="/catalogo"
            className="block text-sm font-medium text-gray-800 hover:text-black transition-colors py-1">
            Ver todo
          </Link>
        </div>

        {/* Marcas desde DB */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Marcas</p>
          <ul className="space-y-2.5">
            {data.marcas.map(m => (
              <li key={m}>
                <Link href={`/catalogo?marca=${encodeURIComponent(m)}`}
                  className="text-sm text-gray-800 hover:text-black transition-colors">
                  {cap(m)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Estilos desde DB */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Estilos</p>
          <ul className="space-y-2.5">
            {data.estilos.slice(0, 8).map(e => (
              <li key={e}>
                <Link href={`/catalogo?grupo_estilo=${encodeURIComponent(e)}`}
                  className="text-sm text-gray-800 hover:text-black transition-colors">
                  {cap(e)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Colores normalizados desde DB — solo si hay */}
        {data.colores.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Colores</p>
            <ul className="space-y-2.5">
              {data.colores.slice(0, 10).map(c => (
                <li key={c}>
                  <Link href={`/catalogo?colores=${encodeURIComponent(c)}`}
                    className="text-sm text-gray-800 hover:text-black transition-colors">
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Search bar ──────────────────────────────────────────────────────────────
function SearchBar() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<{ tipo: string; label: string; href: string }[]>([])
  const [loading, setLoading] = useState(false)
  const router   = useRouter()
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch { setResults([]) }
    finally  { setLoading(false) }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(v), 280)
  }

  const close = () => { setOpen(false); setQuery(''); setResults([]) }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Buscar"
        className="p-2 text-gray-800 hover:text-black transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
      </button>
    )
  }

  return (
    <div className="relative">
      <form onSubmit={e => { e.preventDefault(); if (query.trim()) { router.push(`/catalogo?q=${encodeURIComponent(query.trim())}`); close() } }}
        className="flex items-center gap-2">
        <input autoFocus value={query} onChange={handleChange}
          placeholder="Buscar marca, estilo, color..."
          className="w-56 text-sm border-0 border-b border-bz-ink outline-none px-1 py-1 bg-transparent placeholder-bz-mist"
        />
        <button type="button" onClick={close}
          className="text-gray-400 hover:text-black transition-colors text-xl leading-none">×</button>
      </form>

      {(results.length > 0 || loading) && (
        <div className="absolute top-full right-0 mt-3 w-72 bg-white border border-gray-200 shadow-xl z-50 py-2">
          {loading && <p className="px-4 py-3 text-xs text-gray-400">Buscando...</p>}
          {results.map((r, i) => (
            <Link key={i} href={r.href} onClick={close}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 w-14 shrink-0">{r.tipo}</span>
              <span className="text-sm text-gray-800">{r.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Header principal ────────────────────────────────────────────────────────
type MegaKey = 'mujeres' | 'ninos' | 'hombres' | null

export default function Header({ data }: { data: HeaderData }) {
  const [open, setOpen]   = useState<MegaKey>(null)
  const closeTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enter = (key: MegaKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(key)
  }
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }

  const navItem = (key: MegaKey, label: string) => (
    <div className="relative" onMouseEnter={() => enter(key)} onMouseLeave={leave}>
      <button className={`text-sm tracking-wide transition-colors py-5 border-b-2 ${
        open === key ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-800 hover:text-orange-500'
      }`}>
        {label}
      </button>
      {open === 'mujeres' && key === 'mujeres' && <MegaMujeres data={data.mujeres} />}
      {open === 'ninos'   && key === 'ninos'   && <MegaNinos />}
      {open === 'hombres' && key === 'hombres' && <MegaHombres data={data.hombres} />}
    </div>
  )

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 transition-all duration-300">

      {/* Announcement bar */}
      <div className="bg-black text-white text-center text-[10px] tracking-[0.2em] uppercase py-2.5 px-4 font-medium">
        Envíos a todo el país &nbsp;·&nbsp; Stock real disponible
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">

          {/* Brand serif */}
          <Link href="/inicio" className="font-serif text-2xl font-bold tracking-wide text-black select-none">
            bazzar
          </Link>

          {/* Nav — mega menus */}
          <nav className="hidden md:flex items-center gap-8">
            {navItem('mujeres', 'Mujeres')}
            {navItem('ninos',   'Niños')}
            {navItem('hombres', 'Hombres')}
            <Link href="/catalogo"
              className="text-sm tracking-wide text-gray-800 hover:text-orange-500 transition-colors py-5 border-b-2 border-transparent">
              Catálogo
            </Link>
            {data.showAuditoriaLocal ? (
              <Link
                href="/auditoria-local"
                className="text-sm tracking-wide text-orange-600 hover:text-orange-500 transition-colors py-5 border-b-2 border-transparent font-semibold"
                title="Solo local · no deploy"
              >
                Estadísticas
              </Link>
            ) : null}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-4">
            <SearchBar />
            <CartButton />
          </div>
        </div>
      </div>

      {/* Overlay cierra mega menus */}
      {open && (
        <div className="fixed inset-0 top-[calc(4rem+2.25rem)] z-30"
          onMouseEnter={leave} onClick={() => setOpen(null)} />
      )}
    </header>
  )
}
