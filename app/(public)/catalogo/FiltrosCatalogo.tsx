'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  parseTipoGruposParam,
  sanitizeTipoGruposParaRamo,
  tipoGrupoOpcionesVisibles,
  toggleTipoGrupo,
  type RamoTipoBazzar,
  type TipoGrupoId,
} from '@/lib/filtros/filtro-tipo-canonico'

interface Props {
  marcas: string[]
  estilos: { id: number; nombre: string }[]
  colores: string[]
  totalModelos: number
  totalUnidades: number
  /** Unidad del total según ramo activo */
  unidadLabel: 'pares' | 'prendas' | 'u'
}

const NAVY = '#1E3A5F'
const ORANGE = '#F97316'

export function FiltrosCatalogo({
  marcas,
  estilos,
  totalModelos,
  totalUnidades,
  unidadLabel,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const marcaActual = searchParams.get('marca') ?? ''
  const estiloActual = searchParams.get('grupo_estilo') ?? ''
  const ramoRaw = (searchParams.get('ramo_tipo') ?? '').toUpperCase()
  const ramoActual: RamoTipoBazzar =
    ramoRaw === 'CALZADO' || ramoRaw === 'CONFECCIONES' ? ramoRaw : ''
  const tipoActual = sanitizeTipoGruposParaRamo(
    parseTipoGruposParam(searchParams.get('tipo_grupos')),
    ramoActual || undefined,
  )

  const push = useCallback(
    (opts: {
      marca?: string
      grupo_estilo?: string
      ramo_tipo?: RamoTipoBazzar
      tipo_grupos?: TipoGrupoId[]
    }) => {
      const params = new URLSearchParams()
      const m = opts.marca !== undefined ? opts.marca : marcaActual
      const e = opts.grupo_estilo !== undefined ? opts.grupo_estilo : estiloActual
      const ramo = opts.ramo_tipo !== undefined ? opts.ramo_tipo : ramoActual
      const tipos =
        opts.tipo_grupos !== undefined
          ? sanitizeTipoGruposParaRamo(opts.tipo_grupos, ramo || undefined)
          : sanitizeTipoGruposParaRamo(tipoActual, ramo || undefined)

      if (m) params.set('marca', m)
      if (e) params.set('grupo_estilo', e)
      if (ramo) params.set('ramo_tipo', ramo)
      if (tipos.length) params.set('tipo_grupos', tipos.join(','))
      router.push(`/catalogo${params.toString() ? `?${params}` : ''}`)
    },
    [marcaActual, estiloActual, ramoActual, tipoActual, router],
  )

  const hayFiltros = !!(marcaActual || estiloActual || ramoActual || tipoActual.length)
  const tipoOpts = tipoGrupoOpcionesVisibles(ramoActual || undefined)

  return (
    <div className="mb-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: NAVY }}
          >
            {estiloActual
              ? cap(estiloActual)
              : marcaActual
                ? cap(marcaActual)
                : ramoActual === 'CONFECCIONES'
                  ? 'Confecciones'
                  : ramoActual === 'CALZADO'
                    ? 'Calzado'
                    : 'Catálogo'}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: ORANGE }}>
              {totalModelos.toLocaleString('es-PY')} modelos
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-sm text-slate-400">
              {totalUnidades.toLocaleString('es-PY')} {unidadLabel} · caja abierta
            </span>
          </div>
        </div>

        {hayFiltros && (
          <button
            type="button"
            onClick={() => router.push('/catalogo')}
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold
                       transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500"
            style={{ borderColor: '#e2e8f0', color: '#94a3b8' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Ramo — siamese RIMEC Calzado / Confecciones */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip
          active={!ramoActual}
          tone="navy"
          onClick={() => push({ ramo_tipo: '', tipo_grupos: [] })}
        >
          Todos
        </Chip>
        <Chip
          active={ramoActual === 'CALZADO'}
          tone="navy"
          onClick={() =>
            push({
              ramo_tipo: ramoActual === 'CALZADO' ? '' : 'CALZADO',
              tipo_grupos: [],
            })
          }
        >
          Calzado
        </Chip>
        <Chip
          active={ramoActual === 'CONFECCIONES'}
          tone="navy"
          onClick={() =>
            push({
              ramo_tipo: ramoActual === 'CONFECCIONES' ? '' : 'CONFECCIONES',
              tipo_grupos: [],
            })
          }
        >
          Confecciones
        </Chip>
      </div>

      {/* Tipo — hermanos siameses */}
      {tipoOpts.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="shrink-0 self-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tipo
          </span>
          {tipoOpts.map((o) => (
            <Chip
              key={o.id}
              active={tipoActual.includes(o.id)}
              tone="orange"
              onClick={() => push({ tipo_grupos: toggleTipoGrupo(tipoActual, o.id) })}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      )}

      {/* Estilo */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip
          active={!estiloActual}
          tone="orange"
          onClick={() => push({ grupo_estilo: '' })}
        >
          Todas las líneas
        </Chip>
        {estilos.map((e) => (
          <Chip
            key={e.id}
            active={estiloActual === e.nombre}
            tone="orange"
            onClick={() =>
              push({
                grupo_estilo: estiloActual === e.nombre ? '' : e.nombre,
              })
            }
          >
            {cap(e.nombre)}
          </Chip>
        ))}
      </div>

      {/* Marca */}
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={!marcaActual} tone="navy" onClick={() => push({ marca: '' })}>
          Todas las marcas
        </Chip>
        {marcas.map((m) => (
          <Chip
            key={m}
            active={marcaActual === m}
            tone="navy"
            onClick={() => push({ marca: marcaActual === m ? '' : m })}
          >
            {m}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone: 'navy' | 'orange'
}) {
  const bg = tone === 'navy' ? NAVY : ORANGE
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-150"
      style={
        active
          ? {
              backgroundColor: bg,
              color: 'white',
              boxShadow:
                tone === 'navy'
                  ? '0 2px 8px rgba(30,58,95,0.25)'
                  : '0 2px 8px rgba(249,115,22,0.3)',
            }
          : {
              backgroundColor: tone === 'navy' ? '#f1f5f9' : 'white',
              color: '#64748b',
              border: tone === 'orange' ? '1.5px solid #e2e8f0' : undefined,
            }
      }
    >
      {children}
    </button>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
