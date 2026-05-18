'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  marcas:    string[]
  estilos:   { id: number; nombre: string }[]
  colores:   string[]
  totalModelos: number
  totalPares:   number
}

const NAVY   = '#1E3A5F'
const ORANGE = '#F97316'

export function FiltrosCatalogo({ marcas, estilos, colores, totalModelos, totalPares }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const marcaActual   = searchParams.get('marca')         ?? ''
  const estiloActual  = searchParams.get('grupo_estilo')  ?? ''
  const coloresActual = searchParams.get('colores')
    ? searchParams.get('colores')!.split(',').filter(Boolean)
    : []

  const [colorOpen,  setColorOpen]  = useState(false)
  const [colorQuery, setColorQuery] = useState('')
  const [colorSel,   setColorSel]   = useState<string[]>(coloresActual)
  const [ofertas,    setOfertas]    = useState(false)
  const [buscar,     setBuscar]     = useState('')
  const colorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node))
        setColorOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const coloresFiltrados = colorQuery.length >= 3
    ? colores.filter(c => c.toLowerCase().includes(colorQuery.toLowerCase()))
    : colores

  function toggleColor(c: string) {
    setColorSel(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const aplicar = useCallback((opts: { marca?: string; grupo_estilo?: string; cols?: string[] }) => {
    const params = new URLSearchParams()
    const m  = opts.marca         !== undefined ? opts.marca         : marcaActual
    const e  = opts.grupo_estilo  !== undefined ? opts.grupo_estilo  : estiloActual
    const cs = opts.cols          !== undefined ? opts.cols          : colorSel
    if (m)         params.set('marca',        m)
    if (e)         params.set('grupo_estilo', e)
    if (cs.length) params.set('colores',      cs.join(','))
    router.push(`/catalogo${params.toString() ? '?' + params.toString() : ''}`)
  }, [marcaActual, estiloActual, colorSel, router])

  function cerrarYAplicarColores() {
    setColorOpen(false)
    aplicar({ cols: colorSel })
  }

  const hayFiltros = !!(marcaActual || estiloActual || colorSel.length)

  return (
    <div className="mb-8">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: NAVY }}>
            {estiloActual
              ? estiloActual.charAt(0) + estiloActual.slice(1).toLowerCase()
              : marcaActual
                ? marcaActual.charAt(0) + marcaActual.slice(1).toLowerCase()
                : 'Catálogo'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-semibold" style={{ color: ORANGE }}>
              {totalModelos.toLocaleString('es-PY')} modelos
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-sm text-slate-400">
              {totalPares.toLocaleString('es-PY')} pares disponibles
            </span>
          </div>
        </div>

        {hayFiltros && (
          <button
            onClick={() => { setColorSel([]); router.push('/catalogo') }}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl
                       border transition-all hover:border-red-300 hover:text-red-500 hover:bg-red-50"
            style={{ borderColor: '#e2e8f0', color: '#94a3b8' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Fila 1: Burbujas Grupo de Estilo ── */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 no-scrollbar">
        <EstiloPill active={!estiloActual} onClick={() => aplicar({ grupo_estilo: '' })}>
          Todas las líneas
        </EstiloPill>
        {estilos.map(e => (
          <EstiloPill key={e.id} active={estiloActual === e.nombre} onClick={() => aplicar({ grupo_estilo: estiloActual === e.nombre ? '' : e.nombre })}>
            {cap(e.nombre)}
          </EstiloPill>
        ))}
      </div>

      {/* ── Fila 2: Burbujas Marca ── */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-6 no-scrollbar">
        <MarcaPill active={!marcaActual} onClick={() => aplicar({ marca: '' })}>
          Todas las marcas
        </MarcaPill>
        {marcas.map(m => (
          <MarcaPill key={m} active={marcaActual === m} onClick={() => aplicar({ marca: marcaActual === m ? '' : m })}>
            {m}
          </MarcaPill>
        ))}
      </div>

      {/* ── Fila 3: Buscador ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        
        {/* Buscador de texto */}
        <div className="flex-1 w-full">
          <input 
            value={buscar} 
            onChange={e => setBuscar(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                router.push(`/catalogo?q=${encodeURIComponent(buscar)}`)
              }
            }}
            placeholder="Buscar modelos..."
            className="w-full bg-transparent border-b border-gray-200 px-0 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>

      </div>

        {/* Tags colores activos */}
        {colorSel.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {colorSel.map(c => (
              <span key={c}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold
                           px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#fff7ed', color: ORANGE, border: `1px solid ${ORANGE}40` }}>
                {c}
                <button
                  onClick={() => {
                    const next = colorSel.filter(x => x !== c)
                    setColorSel(next)
                    aplicar({ cols: next })
                  }}
                  className="rounded-full w-3 h-3 flex items-center justify-center
                             hover:bg-orange-200 transition-colors text-[10px] font-black leading-none"
                >×</button>
              </span>
            ))}
          </div>
        )}
    </div>
  )
}

/* ── Pills ── */
function MarcaPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 shrink-0"
      style={active
        ? { backgroundColor: NAVY, color: 'white', boxShadow: '0 2px 8px rgba(30,58,95,0.25)' }
        : { backgroundColor: '#f1f5f9', color: '#64748b' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#e2e8f0' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = '#f1f5f9' }}
    >{children}</button>
  )
}

function EstiloPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0"
      style={active
        ? { backgroundColor: ORANGE, color: 'white', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }
        : { backgroundColor: 'white', color: '#64748b', border: '1.5px solid #e2e8f0' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.color = ORANGE } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' } }}
    >{children}</button>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
