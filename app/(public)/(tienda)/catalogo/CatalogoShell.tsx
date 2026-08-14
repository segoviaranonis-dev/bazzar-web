'use client'

import { useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'bazzar.catalogo.filtros.min'

type Props = {
  filters: ReactNode
  children: ReactNode
}

/**
 * Desktop: panel flotante minimizable.
 * Móvil: productos primero · filtros en drawer (no bloquean scroll).
 */
export function CatalogoShell({ filters, children }: Props) {
  const [min, setMin] = useState(false)
  const [ready, setReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      setMin(sessionStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const toggle = () => {
    setMin((v) => {
      const next = !v
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div className="relative min-h-[50vh] w-full">
      {/* Desktop: panel flotante fijo al borde izquierdo */}
      <div
        className={`pointer-events-none fixed bottom-4 left-0 top-16 z-40 hidden lg:block ${
          ready ? '' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex h-[calc(100vh-4.5rem)] items-stretch pl-2 pr-1 pt-2">
          {min ? (
            <button
              type="button"
              onClick={toggle}
              className="touch-target my-2 flex w-11 flex-col items-center justify-center gap-3 rounded-r-2xl border border-slate-200 bg-white/95 py-4 shadow-lg backdrop-blur-md transition hover:bg-white"
              title="Mostrar filtros"
              aria-label="Mostrar filtros"
            >
              <span className="text-lg leading-none text-slate-700">☰</span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Filtros
              </span>
            </button>
          ) : (
            <div className="flex h-full w-[min(300px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Filtros
                </span>
                <button
                  type="button"
                  onClick={toggle}
                  className="touch-target rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                  title="Minimizar filtros"
                  aria-label="Minimizar filtros"
                >
                  Minimizar
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
                {filters}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Móvil: barra sticky — productos primero */}
      <div className="sticky top-16 z-30 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur-md lg:hidden">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Catálogo
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="touch-target inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-800 shadow-sm"
          aria-label="Abrir filtros"
        >
          <span aria-hidden>☰</span>
          Filtros
        </button>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
            aria-label="Cerrar filtros"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-[70] flex w-[min(100vw,340px)] flex-col bg-white shadow-2xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros del catálogo"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-800">Filtros</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="touch-target flex items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:bg-slate-50"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {filters}
            </div>
            <div className="safe-bottom shrink-0 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full py-3.5 text-sm"
              >
                Ver productos
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div
        className={`px-4 py-4 transition-[padding] duration-300 md:px-6 md:py-6 lg:pr-8 ${
          min ? 'lg:pl-16' : 'lg:pl-[318px]'
        }`}
        data-catalogo-grid
      >
        {children}
      </div>
    </div>
  )
}
