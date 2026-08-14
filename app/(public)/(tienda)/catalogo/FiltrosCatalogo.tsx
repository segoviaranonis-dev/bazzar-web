'use client'

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  parseTipoGruposParam,
  sanitizeTipoGruposParaRamo,
  type RamoTipoBazzar,
  type TipoGrupoId,
} from '@/lib/filtros/filtro-tipo-canonico'
import { CatalogoSearchField } from '@/components/CatalogoSearchField'

interface Props {
  marcasCalzado: string[]
  marcasConfecciones: string[]
  generos: { id: number; nombre: string }[]
  estilos: { id: number; nombre: string }[]
  lineas: string[]
  materiales: string[]
  colores: string[]
  totalModelos: number
  totalUnidades: number
  unidadLabel: 'pares' | 'prendas' | 'u'
}

const AZUL = '#1E3A5F'
const NARANJA = '#F97316'

/**
 * Sidebar retail-friendly (cliente final).
 *
 * Mapa de filtros (URL):
 * | Acción                         | Params                                      |
 * |--------------------------------|---------------------------------------------|
 * | Buscar                         | q                                           |
 * | Abrir Calzados / Confecciones  | ramo_tipo=654/638 (+ limpia molécula)       |
 * | Marca bajo ramo                | ramo_tipo + marca                           |
 * | Estilo (pila)                  | grupo_estilo · sin ramo = todos; con ramo = cascada |
 * | Afinar búsqueda                | oculto (fuera de alcance actual)                    |
 *
 * Cascada: ramo (654≠638) → estilos solo del proveedor activo (2.2.1.42).
 */
export function FiltrosCatalogo({
  marcasCalzado,
  marcasConfecciones,
  estilos,
  totalModelos,
  totalUnidades,
  unidadLabel,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const marcaActual = searchParams.get('marca') ?? ''
  const generoActual = searchParams.get('genero_id') ?? ''
  const estiloActual = searchParams.get('grupo_estilo') ?? ''
  const lineaActual = searchParams.get('linea') ?? ''
  const materialActual = searchParams.get('material') ?? ''
  const colorActual = searchParams.get('colores') ?? ''
  const qActual = searchParams.get('q') ?? ''
  const ramoRaw = (searchParams.get('ramo_tipo') ?? '').toUpperCase()
  const ramoActual: RamoTipoBazzar =
    ramoRaw === 'CALZADO' || ramoRaw === 'CONFECCIONES' ? ramoRaw : ''
  const tipoActual = sanitizeTipoGruposParaRamo(
    parseTipoGruposParam(searchParams.get('tipo_grupos')),
    ramoActual || undefined,
  )

  const [openCalzado, setOpenCalzado] = useState(
    () => ramoActual !== 'CONFECCIONES' || !!marcaActual,
  )
  const [openConfecciones, setOpenConfecciones] = useState(
    () => ramoActual === 'CONFECCIONES',
  )
  const [openEstilos, setOpenEstilos] = useState(true)

  const push = useCallback(
    (opts: {
      marca?: string
      genero_id?: string
      grupo_estilo?: string
      linea?: string
      material?: string
      colores?: string
      q?: string
      ramo_tipo?: RamoTipoBazzar
      tipo_grupos?: TipoGrupoId[]
      clearMolecula?: boolean
      clearDesde?: 'estilo' | 'linea' | 'material'
    }) => {
      const params = new URLSearchParams()
      const m = opts.marca !== undefined ? opts.marca : marcaActual
      const g = opts.genero_id !== undefined ? opts.genero_id : generoActual
      let e = opts.grupo_estilo !== undefined ? opts.grupo_estilo : estiloActual
      let lin = opts.linea !== undefined ? opts.linea : lineaActual
      let mat = opts.material !== undefined ? opts.material : materialActual
      let c = opts.colores !== undefined ? opts.colores : colorActual
      const q = opts.q !== undefined ? opts.q : qActual
      const ramo = opts.ramo_tipo !== undefined ? opts.ramo_tipo : ramoActual
      const tipos =
        opts.tipo_grupos !== undefined
          ? sanitizeTipoGruposParaRamo(opts.tipo_grupos, ramo || undefined)
          : sanitizeTipoGruposParaRamo(tipoActual, ramo || undefined)

      if (opts.clearMolecula) {
        e = ''
        lin = ''
        mat = ''
        c = ''
      } else if (opts.clearDesde === 'estilo') {
        lin = ''
        mat = ''
        c = ''
      } else if (opts.clearDesde === 'linea') {
        mat = ''
        c = ''
      } else if (opts.clearDesde === 'material') {
        c = ''
      }

      if (m) params.set('marca', m)
      if (g) params.set('genero_id', g)
      if (e) params.set('grupo_estilo', e)
      if (lin) params.set('linea', lin)
      if (mat) params.set('material', mat)
      if (c) params.set('colores', c)
      if (q.trim()) params.set('q', q.trim())
      if (ramo) params.set('ramo_tipo', ramo)
      if (tipos.length) params.set('tipo_grupos', tipos.join(','))
      const href = `/catalogo${params.toString() ? `?${params}` : ''}`
      startTransition(() => {
        router.push(href)
      })
    },
    [
      marcaActual,
      generoActual,
      estiloActual,
      lineaActual,
      materialActual,
      colorActual,
      qActual,
      ramoActual,
      tipoActual,
      router,
    ],
  )

  const activarRamo = (ramo: RamoTipoBazzar) => {
    if (ramo === 'CALZADO') {
      setOpenCalzado(true)
      setOpenConfecciones(false)
    } else if (ramo === 'CONFECCIONES') {
      setOpenConfecciones(true)
      setOpenCalzado(false)
    }
    if (ramoActual === ramo) return
    push({
      ramo_tipo: ramo,
      marca: '',
      genero_id: '',
      clearMolecula: true,
      tipo_grupos: [],
    })
  }

  const toggleRamo = (ramo: 'CALZADO' | 'CONFECCIONES') => {
    const isOpen = ramo === 'CALZADO' ? openCalzado : openConfecciones
    const setOpen = ramo === 'CALZADO' ? setOpenCalzado : setOpenConfecciones
    // Abierto pero sin ramo activo → primer clic enciende cascada (no cierra)
    if (isOpen && ramoActual !== ramo) {
      activarRamo(ramo)
      return
    }
    if (isOpen) {
      setOpen(false)
      return
    }
    activarRamo(ramo)
  }

  const seleccionarMarca = (ramo: RamoTipoBazzar, marca: string) => {
    const misma = ramoActual === ramo && marcaActual === marca
    if (misma) {
      push({ marca: '', ramo_tipo: ramo, clearMolecula: true, tipo_grupos: [] })
      return
    }
    push({
      marca,
      ramo_tipo: ramo,
      clearMolecula: true,
      tipo_grupos: [],
      genero_id: '',
    })
    if (ramo === 'CALZADO') {
      setOpenCalzado(true)
      setOpenConfecciones(false)
    } else {
      setOpenConfecciones(true)
      setOpenCalzado(false)
    }
  }

  const dirty = !!(
    marcaActual ||
    generoActual ||
    estiloActual ||
    lineaActual ||
    materialActual ||
    colorActual ||
    qActual ||
    ramoActual ||
    tipoActual.length
  )

  const estilosPila = useMemo(
    () =>
      [...estilos].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
      ),
    [estilos],
  )

  const titulo = estiloActual
    ? cap(estiloActual)
    : marcaActual
      ? cap(marcaActual)
      : ramoActual === 'CONFECCIONES'
        ? 'Confecciones'
        : ramoActual === 'CALZADO'
          ? 'Calzados'
          : 'Catálogo'

  return (
    <div
      className={`flex w-full flex-col gap-4 transition-opacity ${
        isPending ? 'opacity-70' : 'opacity-100'
      }`}
      aria-label="Filtros del catálogo"
      aria-busy={isPending}
    >
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight" style={{ color: AZUL }}>
          {titulo}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-orange-500">
            {totalModelos.toLocaleString('es-PY')} modelos
          </span>
          {' · '}
          {totalUnidades.toLocaleString('es-PY')} {unidadLabel} · por talle
          {isPending ? (
            <span className="ml-1 font-medium text-slate-400">· actualizando…</span>
          ) : null}
        </p>
        {dirty ? (
          <button
            type="button"
            onClick={() => startTransition(() => router.push('/catalogo'))}
            className="mt-2 text-[11px] font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <CatalogoSearchField variant="sidebar" onApplyQ={(q) => push({ q })} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <RamoAcordeon
          title="Calzados"
          open={openCalzado}
          onToggle={() => toggleRamo('CALZADO')}
          active={ramoActual === 'CALZADO'}
        >
          {marcasCalzado.length === 0 ? (
            <p className="py-2 text-[11px] text-slate-400">Sin marcas en calzado</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {marcasCalzado.map((m) => (
                <li key={m}>
                  <MarcaItem
                    label={m}
                    selected={ramoActual === 'CALZADO' && marcaActual === m}
                    onClick={() => seleccionarMarca('CALZADO', m)}
                  />
                </li>
              ))}
            </ul>
          )}
        </RamoAcordeon>

        <RamoAcordeon
          title="Confecciones"
          open={openConfecciones}
          onToggle={() => toggleRamo('CONFECCIONES')}
          active={ramoActual === 'CONFECCIONES'}
          borderTop
        >
          {marcasConfecciones.length === 0 ? (
            <p className="py-2 text-[11px] text-slate-400">Sin marcas en confecciones</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {marcasConfecciones.map((m) => (
                <li key={m}>
                  <MarcaItem
                    label={m}
                    selected={ramoActual === 'CONFECCIONES' && marcaActual === m}
                    onClick={() => seleccionarMarca('CONFECCIONES', m)}
                  />
                </li>
              ))}
            </ul>
          )}
        </RamoAcordeon>
      </div>

      {/* Estilos — pila vertical · cascada por ramo (654 / 638) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setOpenEstilos((v) => !v)}
          className="flex w-full min-h-11 items-center justify-between px-4 py-3 text-left"
          aria-expanded={openEstilos}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: AZUL }}>
            Estilos
            {estiloActual ? (
              <span
                className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal"
                style={{ backgroundColor: '#FFEDD5', color: '#9A3412' }}
              >
                1
              </span>
            ) : null}
          </span>
          <span className="text-slate-400">{openEstilos ? '▴' : '▾'}</span>
        </button>
        {openEstilos ? (
          <div className="border-t border-slate-100 px-2 pb-3 pt-1">
            {estilosPila.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-slate-400">Sin estilos con stock</p>
            ) : (
              <ul className="flex flex-col">
                {estilosPila.map((e) => {
                  const on = estiloActual.toLowerCase() === e.nombre.toLowerCase()
                  return (
                    <li key={`${e.id}-${e.nombre}`}>
                      <button
                        type="button"
                        onClick={() =>
                          push({
                            grupo_estilo: on ? '' : e.nombre,
                            clearDesde: 'estilo',
                          })
                        }
                        className={`w-full min-h-11 rounded-lg px-3 py-2.5 text-left text-[13px] capitalize transition ${
                          on
                            ? 'border border-slate-300 bg-white font-semibold text-slate-900 shadow-sm'
                            : 'border border-transparent text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {cap(e.nombre)}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RamoAcordeon({
  title,
  open,
  onToggle,
  active,
  borderTop,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  active?: boolean
  borderTop?: boolean
  children: ReactNode
}) {
  return (
    <div className={borderTop ? 'border-t border-slate-100' : undefined}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-h-11 items-center justify-between px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span
          className={`text-[13px] font-bold uppercase tracking-[0.08em] ${
            active ? '' : 'opacity-90'
          }`}
        >
          <span style={{ color: AZUL }}>{title}</span>
          <span style={{ color: NARANJA }}> - Marcas</span>
        </span>
        <span className="text-xs text-slate-400">{open ? '▴' : '▾'}</span>
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  )
}

function MarcaItem({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-11 rounded-lg px-3 py-2.5 text-left text-[13px] uppercase tracking-wide transition ${
        selected
          ? 'border border-slate-300 bg-white font-semibold text-slate-900 shadow-sm'
          : 'border border-transparent text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}

function cap(s: string): string {
  const t = s.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}
