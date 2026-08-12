'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  parseTipoGruposParam,
  sanitizeTipoGruposParaRamo,
  tipoGrupoOpcionesVisibles,
  toggleTipoGrupo,
  type RamoTipoBazzar,
  type TipoGrupoId,
} from '@/lib/filtros/filtro-tipo-canonico'
import { CatalogoSearchField } from '@/components/CatalogoSearchField'

interface Props {
  marcas: string[]
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

/**
 * Sidebar Dimensiones + Molécula — protocolo hermanos siameses 2.2.1.44 / 2.2.1.42.
 * Par depósito Report `/bazzar-web/deposito-web` · canal ALM_WEB.
 * Cascada: dimensión limpia molécula; Estilo→Línea→Material→Color.
 */
export function FiltrosCatalogo({
  marcas,
  generos,
  estilos,
  lineas,
  materiales,
  colores,
  totalModelos,
  totalUnidades,
  unidadLabel,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bloqueDimOpen, setBloqueDimOpen] = useState(true)
  const [bloqueMolOpen, setBloqueMolOpen] = useState(true)

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
      /** Limpiar molécula al cambiar dimensión (2.2.1.42). */
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
      router.push(`/catalogo${params.toString() ? `?${params}` : ''}`)
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
  const tipoOpts = tipoGrupoOpcionesVisibles(ramoActual || undefined)

  const badgeDim = useMemo(() => {
    let n = 0
    if (ramoActual) n++
    if (tipoActual.length) n += tipoActual.length
    if (marcaActual) n++
    if (generoActual) n++
    if (qActual) n++
    return n
  }, [ramoActual, tipoActual, marcaActual, generoActual, qActual])

  const badgeMol = useMemo(() => {
    let n = 0
    if (estiloActual) n++
    if (lineaActual) n++
    if (materialActual) n++
    if (colorActual) n++
    return n
  }, [estiloActual, lineaActual, materialActual, colorActual])

  return (
    <div className="flex w-full flex-col gap-3" aria-label="Filtros catálogo · dimensiones + molécula">
      <div className="mb-1">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: AZUL }}>
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
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-orange-500">
            {totalModelos.toLocaleString('es-PY')} modelos
          </span>
          {' · '}
          {totalUnidades.toLocaleString('es-PY')} {unidadLabel} · caja abierta
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:flex-col">
        <BloqueColapsable
          title="Dimensiones"
          railLabel="Dimensiones"
          badge={badgeDim}
          open={bloqueDimOpen}
          onToggle={() => setBloqueDimOpen((v) => !v)}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] text-slate-500">Multi-selección · canal ALM_WEB</p>
            {dirty ? (
              <button
                type="button"
                onClick={() => router.push('/catalogo')}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Categoría
            </span>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: '' as RamoTipoBazzar, label: 'Todos' },
                  { id: 'CALZADO' as const, label: 'Calzado' },
                  { id: 'CONFECCIONES' as const, label: 'Confecciones' },
                ] as const
              ).map((opt) => {
                const on = ramoActual === opt.id
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      push({
                        ramo_tipo: on && opt.id ? '' : opt.id,
                        tipo_grupos: [],
                        clearMolecula: true,
                      })
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      on
                        ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <CatalogoSearchField
            variant="sidebar"
            onApplyQ={(q) => push({ q })}
          />

          <AcordeonMulti
            title="Marca · MULTI"
            count={marcaActual ? 1 : 0}
            onClear={() => push({ marca: '', clearMolecula: true })}
          >
            <ChipList
              items={marcas.map((m) => ({ id: m, label: m }))}
              selected={marcaActual ? [marcaActual] : []}
              onToggle={(id) =>
                push({ marca: marcaActual === id ? '' : id, clearMolecula: true })
              }
            />
          </AcordeonMulti>

          <AcordeonMulti
            title="Género · MULTI"
            count={generoActual ? 1 : 0}
            onClear={() => push({ genero_id: '', clearMolecula: true })}
          >
            {generos.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-slate-400">Sin opciones (sin stock)</p>
            ) : (
              <ChipList
                items={generos.map((g) => ({ id: String(g.id), label: cap(g.nombre) }))}
                selected={generoActual ? [generoActual] : []}
                onToggle={(id) =>
                  push({
                    genero_id: generoActual === id ? '' : id,
                    clearMolecula: true,
                  })
                }
              />
            )}
          </AcordeonMulti>

          {tipoOpts.length > 0 ? (
            <AcordeonMulti
              title="Tipo · MULTI"
              count={tipoActual.length}
              onClear={() => push({ tipo_grupos: [], clearMolecula: true })}
              defaultOpen
            >
              <ChipList
                items={tipoOpts.map((o) => ({ id: o.id, label: o.label }))}
                selected={tipoActual}
                onToggle={(id) =>
                  push({
                    tipo_grupos: toggleTipoGrupo(tipoActual, id as TipoGrupoId),
                    clearMolecula: true,
                  })
                }
                tone="orange"
              />
            </AcordeonMulti>
          ) : null}
        </BloqueColapsable>

        <BloqueColapsable
          title="Molécula"
          railLabel="Estilo · Línea · Mat · Color"
          badge={badgeMol}
          open={bloqueMolOpen}
          onToggle={() => setBloqueMolOpen((v) => !v)}
        >
          <p className="text-[10px] text-slate-500">
            Cascada: Estilo → Línea → Material → Color · facetas = stock vivo
          </p>

          <AcordeonMulti
            title="Estilo · MULTI"
            count={estiloActual ? 1 : 0}
            onClear={() => push({ grupo_estilo: '', clearDesde: 'estilo' })}
            defaultOpen
          >
            {estilos.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-slate-400">Sin opciones (sin estilo en stock)</p>
            ) : (
              <ChipList
                items={estilos.map((e) => ({ id: e.nombre, label: cap(e.nombre) }))}
                selected={estiloActual ? [estiloActual] : []}
                onToggle={(id) =>
                  push({
                    grupo_estilo: estiloActual === id ? '' : id,
                    clearDesde: 'estilo',
                  })
                }
                tone="orange"
              />
            )}
          </AcordeonMulti>

          <AcordeonMulti
            title="Línea · MULTI"
            count={lineaActual ? 1 : 0}
            onClear={() => push({ linea: '', clearDesde: 'linea' })}
          >
            {lineas.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-slate-400">Sin opciones (sin stock)</p>
            ) : (
              <ChipList
                items={lineas.slice(0, 80).map((l) => ({ id: l, label: l }))}
                selected={lineaActual ? [lineaActual] : []}
                onToggle={(id) =>
                  push({
                    linea: lineaActual === id ? '' : id,
                    clearDesde: 'linea',
                  })
                }
              />
            )}
          </AcordeonMulti>

          <AcordeonMulti
            title="Material · MULTI"
            count={materialActual ? 1 : 0}
            onClear={() => push({ material: '', clearDesde: 'material' })}
          >
            {materiales.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-slate-400">Sin opciones (sin stock)</p>
            ) : (
              <ChipList
                items={materiales.slice(0, 60).map((m) => ({ id: m, label: cap(m) }))}
                selected={materialActual ? [materialActual] : []}
                onToggle={(id) =>
                  push({
                    material: materialActual === id ? '' : id,
                    clearDesde: 'material',
                  })
                }
              />
            )}
          </AcordeonMulti>

          <AcordeonMulti
            title="Color · MULTI"
            count={colorActual ? 1 : 0}
            onClear={() => push({ colores: '' })}
          >
            {colores.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-slate-400">Sin opciones (sin stock)</p>
            ) : (
              <ChipList
                items={colores.slice(0, 40).map((c) => ({
                  id: c.toLowerCase(),
                  label: cap(c),
                }))}
                selected={colorActual ? [colorActual.toLowerCase()] : []}
                onToggle={(id) =>
                  push({ colores: colorActual.toLowerCase() === id ? '' : id })
                }
              />
            )}
          </AcordeonMulti>
        </BloqueColapsable>
      </div>
    </div>
  )
}

function BloqueColapsable({
  title,
  badge,
  open,
  onToggle,
  children,
  railLabel,
}: {
  title: string
  badge?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  railLabel: string
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={`Mostrar ${title}`}
        className="flex h-full min-h-[10rem] w-9 shrink-0 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 shadow-sm transition hover:border-[#1E3A5F]/40 hover:bg-slate-50"
        aria-expanded={false}
      >
        <span style={{ color: AZUL }} aria-hidden>
          ▸
        </span>
        {badge && badge > 0 ? (
          <span className="rounded-full bg-[#1E3A5F] px-1.5 py-0.5 text-[9px] font-black text-white">
            {badge}
          </span>
        ) : null}
        <span
          className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {railLabel}
        </span>
      </button>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-sm lg:w-60">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: AZUL }}>
          {title}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md px-1.5 py-1 text-sm text-slate-500 hover:bg-slate-100"
          aria-expanded
          title="Ocultar"
        >
          ◂
        </button>
      </div>
      <div className="flex flex-col gap-3 p-3">{children}</div>
    </div>
  )
}

function AcordeonMulti({
  title,
  count,
  onClear,
  children,
  defaultOpen = false,
}: {
  title: string
  count: number
  onClear: () => void
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-slate-200/90 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          <span className="text-[#1E3A5F] transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          {title}
          {count > 0 ? (
            <span className="rounded-full bg-[#1E3A5F] px-1.5 py-0.5 text-[9px] font-black text-white">
              {count}
            </span>
          ) : null}
        </span>
        {count > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClear()
            }}
            className="text-[9px] font-bold text-red-600 hover:underline"
          >
            Limpiar
          </button>
        ) : null}
      </summary>
      <div className="border-t border-slate-100 p-2">{children}</div>
    </details>
  )
}

function ChipList({
  items,
  selected,
  onToggle,
  tone = 'navy',
}: {
  items: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  tone?: 'navy' | 'orange'
}) {
  const onBg = tone === 'navy' ? AZUL : '#F97316'
  return (
    <ul className="space-y-0.5" role="group">
      {items.map((item) => {
        const on = selected.includes(item.id)
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition ${
                on ? 'font-semibold text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              style={on ? { backgroundColor: onBg } : undefined}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
