'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AuditoriaLocalPayload,
  Hueco,
  MarcaBloque,
  RamoBloque,
  TallaStock,
} from '@/lib/auditoria-local/types'
import { FAMILIAS_TALLE_638, parseGradaAbierta638 } from '@/lib/auditoria-local/grada638'
import { ProductImage } from '@/components/ProductImage'

const NAVY = '#1E3A5F'
const ORANGE = '#F97316'

const PROBLEMA: Record<Hueco['problema'], string> = {
  sin_web: 'En depósito, NO en catálogo web',
  sin_sano: 'En depósito, NO en Stock Sano',
  solo_deposito: 'Solo depósito',
  pares_diff: 'Pares distintos Dep vs Web',
}

function Badge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
      }`}
    >
      {label ?? (ok ? 'OK' : 'FAIL')}
    </span>
  )
}

type FilaVariante = {
  key: string
  codigo: string
  linea: string
  referencia: string
  material: string
  material_desc: string | null
  color_code: string
  color_nombre: string
  estilo: string
  es_medias: boolean
  ok: boolean
  pares_web: number
  pares_dep: number
  precio_web: number | null
  tallas: TallaStock[]
}

type GradaCol = { talla: string; talla_orden: number }

/** Orden RIMEC: etiqueta numérica (curva del modelo), no unión de marca. */
function compararTallaEtiqueta(a: string, b: string, ordenA = 0, ordenB = 0): number {
  const na = Number.parseFloat(String(a).replace(',', '.'))
  const nb = Number.parseFloat(String(b).replace(',', '.'))
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
  const lex = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  if (lex !== 0) return lex
  return ordenA - ordenB
}

/** Grada real del modelo/color (curva tipo_v2), no frankenstein de marca. */
function gradaDeFila(tallas: TallaStock[]): GradaCol[] {
  const map = new Map<string, number>()
  for (const t of tallas) {
    if ((t.stock_web || 0) <= 0 && (t.stock_dep || 0) <= 0) continue
    const prev = map.get(t.talla)
    if (prev == null || t.talla_orden < prev) map.set(t.talla, t.talla_orden)
  }
  // si todo vacío, usar etiquetas presentes
  if (map.size === 0) {
    for (const t of tallas) {
      const prev = map.get(t.talla)
      if (prev == null || t.talla_orden < prev) map.set(t.talla, t.talla_orden)
    }
  }
  return Array.from(map.entries())
    .map(([talla, talla_orden]) => ({ talla, talla_orden }))
    .sort((a, b) => compararTallaEtiqueta(a.talla, b.talla, a.talla_orden, b.talla_orden))
}

function firmaGrada(grada: GradaCol[]): string {
  return grada.map((g) => g.talla).join('|')
}

function filasDeMarca(marca: MarcaBloque): FilaVariante[] {
  const out: FilaVariante[] = []
  for (const m of marca.modelos_detalle) {
    if (m.tipo_v2 === 'Confecciones') {
      out.push({
        key: m.key,
        codigo: `${m.linea}-${m.referencia}-${m.material}${m.color_code ? `-${m.color_code}` : ''}`,
        linea: m.linea,
        referencia: m.referencia,
        material: m.material,
        material_desc: m.material_desc,
        color_code: m.color_code || '—',
        color_nombre: m.color_nombre || m.color_code || '—',
        estilo: m.estilo || '(sin estilo)',
        es_medias: m.es_medias_o_ropa_654,
        ok: m.ok_stock,
        pares_web: m.web_pares,
        pares_dep: m.dep_pares,
        precio_web: m.tallas.find((t) => t.precio_web != null)?.precio_web ?? null,
        tallas: m.tallas,
      })
    } else {
      for (const c of m.colores) {
        out.push({
          key: `${m.key}|${c.color_code}`,
          codigo: `${m.linea}-${m.referencia}-${m.material}`,
          linea: m.linea,
          referencia: m.referencia,
          material: m.material,
          material_desc: m.material_desc,
          color_code: c.color_code,
          color_nombre: c.color_nombre,
          estilo: m.estilo || '(sin estilo)',
          es_medias: m.es_medias_o_ropa_654,
          ok: m.ok_stock,
          pares_web: c.pares_web,
          pares_dep: c.tallas.reduce((s, t) => s + t.stock_dep, 0),
          precio_web: c.tallas.find((t) => t.precio_web != null)?.precio_web ?? null,
          tallas: c.tallas,
        })
      }
    }
  }
  return out
}

type GrupoGrada = { firma: string; grada: GradaCol[]; filas: FilaVariante[] }

/** Agrupa filas por curva real (654/638). Prohibido unir tallas distintas en una cabecera. */
function gruposPorGrada(filas: FilaVariante[]): GrupoGrada[] {
  const map = new Map<string, GrupoGrada>()
  for (const f of filas) {
    const grada = gradaDeFila(f.tallas)
    const firma = firmaGrada(grada) || '(sin)'
    let g = map.get(firma)
    if (!g) {
      g = { firma, grada, filas: [] }
      map.set(firma, g)
    }
    g.filas.push(f)
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.grada[0]?.talla ?? ''
    const tb = b.grada[0]?.talla ?? ''
    const cmp = compararTallaEtiqueta(ta, tb)
    if (cmp !== 0) return cmp
    return a.grada.length - b.grada.length || a.firma.localeCompare(b.firma)
  })
}

function MiniaturaFila({
  f,
  proveedorId,
}: {
  f: Pick<FilaVariante, 'linea' | 'referencia' | 'material' | 'color_code' | 'color_nombre'>
  proveedorId: number
}) {
  return (
    <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <ProductImage
        item={{
          linea_codigo: f.linea,
          referencia_codigo: f.referencia,
          material_code: f.material,
          color_code: f.color_code,
          color_nombre: f.color_nombre,
          proveedor_importacion_id: proveedorId,
        }}
        alt={`${f.linea} ${f.color_nombre || f.color_code}`}
        variant="thumb"
        className="h-full w-full object-contain"
      />
    </div>
  )
}

function TablaGrupoGrada({
  grupo,
  unidad,
  showFotos,
  proveedorId,
}: {
  grupo: GrupoGrada
  unidad: 'pares' | 'prendas'
  showFotos: boolean
  proveedorId: number
}) {
  const label =
    grupo.grada.length > 0
      ? `${grupo.grada[0].talla}–${grupo.grada[grupo.grada.length - 1].talla}`
      : '—'
  return (
    <div className="border-t border-slate-100">
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Grada modelo
        </span>
        <span className="font-mono text-xs font-bold" style={{ color: NAVY }}>
          {label}
        </span>
        <span className="flex flex-wrap gap-1">
          {grupo.grada.map((g) => (
            <span
              key={g.talla}
              className="inline-flex min-w-[1.5rem] justify-center rounded border border-slate-300 bg-white px-1 font-mono text-[11px] font-bold"
              style={{ color: NAVY }}
            >
              {g.talla}
            </span>
          ))}
        </span>
        <span className="text-[10px] text-slate-400">
          {grupo.filas.length} color{grupo.filas.length === 1 ? '' : 'es'} · {unidad}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-[10px] uppercase tracking-wide text-slate-500">
              {showFotos ? <th className="px-2 py-2 text-left font-bold">Foto</th> : null}
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left font-bold">Modelo</th>
              <th className="px-2 py-2 text-left font-bold">Color</th>
              <th className="px-2 py-2 text-left font-bold">Estilo</th>
              <th className="px-2 py-2 text-left font-bold">Mat</th>
              <th className="px-1 py-2 text-center font-bold text-slate-400">{unidad}</th>
              {grupo.grada.map((g) => (
                <th
                  key={g.talla}
                  className="min-w-[2.25rem] px-1 py-2 text-center font-mono text-[12px] font-bold"
                  style={{ color: NAVY }}
                >
                  {g.talla}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-bold">Tot</th>
              <th className="px-2 py-2 text-right font-bold">Precio</th>
              <th className="px-2 py-2 text-center font-bold">OK</th>
            </tr>
          </thead>
          <tbody>
            {grupo.filas.map((f) => {
              const byTalla = new Map(f.tallas.map((t) => [t.talla, t]))
              const colorDesc =
                f.color_nombre && f.color_nombre !== f.color_code ? f.color_nombre : null
              return (
                <FragmentRow
                  key={f.key}
                  f={f}
                  grada={grupo.grada}
                  byTalla={byTalla}
                  colorDesc={colorDesc}
                  showFotos={showFotos}
                  proveedorId={proveedorId}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Marca → grupos por grada real (doc RIMEC 654/638). */
function TablasMarcaPorGrada({
  marca,
  unidad,
  showFotos,
  proveedorId,
}: {
  marca: MarcaBloque
  unidad: 'pares' | 'prendas'
  showFotos: boolean
  proveedorId: number
}) {
  const grupos = useMemo(() => gruposPorGrada(filasDeMarca(marca)), [marca])
  if (grupos.length === 0) {
    return <p className="px-3 py-2 text-xs text-slate-400">Sin filas en esta marca.</p>
  }
  return (
    <div>
      {grupos.map((g) => (
        <TablaGrupoGrada
          key={g.firma}
          grupo={g}
          unidad={unidad}
          showFotos={showFotos}
          proveedorId={proveedorId}
        />
      ))}
    </div>
  )
}

function FragmentRow({
  f,
  grada,
  byTalla,
  colorDesc,
  showFotos,
  proveedorId,
}: {
  f: FilaVariante
  grada: GradaCol[]
  byTalla: Map<string, TallaStock>
  colorDesc: string | null
  showFotos: boolean
  proveedorId: number
}) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-white">
        {showFotos ? (
          <td className="px-2 py-1.5 align-top" rowSpan={2}>
            <MiniaturaFila f={f} proveedorId={proveedorId} />
          </td>
        ) : null}
        <td className="sticky left-0 z-[1] bg-white px-3 py-1.5 align-top" rowSpan={2}>
          <div className="font-mono text-[12px] font-semibold" style={{ color: NAVY }}>
            {f.codigo}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            L {f.linea} · R {f.referencia}
            {f.es_medias ? ' · medias/ropa' : ''}
          </div>
        </td>
        <td className="px-2 py-1.5 align-top" rowSpan={2}>
          <span className="font-mono font-semibold" style={{ color: NAVY }}>
            {f.color_code}
          </span>
          {colorDesc ? <div className="text-[10px] text-slate-500">{colorDesc}</div> : null}
        </td>
        <td className="px-2 py-1.5 align-top text-slate-700" rowSpan={2}>
          {f.estilo}
        </td>
        <td className="max-w-[140px] px-2 py-1.5 align-top" rowSpan={2}>
          <span className="font-mono text-slate-600">{f.material}</span>
          {f.material_desc ? (
            <div className="truncate text-[10px] text-slate-400" title={f.material_desc}>
              {f.material_desc}
            </div>
          ) : null}
        </td>
        <td className="px-1 py-1 text-center text-[10px] font-bold uppercase text-slate-400">
          Web
        </td>
        {grada.map((g) => {
          const t = byTalla.get(g.talla)
          return (
            <td key={`w-${f.key}-${g.talla}`} className="px-1 py-1 text-center font-mono">
              {t ? t.stock_web : '·'}
            </td>
          )
        })}
        <td className="px-2 py-1 text-right font-mono font-semibold">{f.pares_web}</td>
        <td className="px-2 py-1 text-right font-mono text-slate-500" rowSpan={2}>
          {f.precio_web != null ? Math.round(f.precio_web).toLocaleString('es-PY') : '—'}
        </td>
        <td className="px-2 py-1 text-center" rowSpan={2}>
          <Badge ok={f.ok} />
        </td>
      </tr>
      <tr className="border-t border-slate-50 bg-slate-50/50">
        <td className="px-1 py-1 text-center text-[10px] font-bold uppercase text-slate-400">
          Dep
        </td>
        {grada.map((g) => {
          const t = byTalla.get(g.talla)
          const mismatch = t && t.stock_web !== t.stock_dep
          return (
            <td
              key={`d-${f.key}-${g.talla}`}
              className={`px-1 py-1 text-center font-mono ${mismatch ? 'text-red-600' : ''}`}
            >
              {t ? t.stock_dep : '·'}
            </td>
          )
        })}
        <td className="px-2 py-1 text-right font-mono">{f.pares_dep}</td>
      </tr>
    </>
  )
}

/** Cabecera acordeón marca (compartida 654/638). */
function MarcaHeader({
  marca,
  open,
  onToggle,
  hint,
  unidadLabel,
  badgeOk,
  badgeLabel,
}: {
  marca: MarcaBloque
  open: boolean
  onToggle: () => void
  hint?: string
  unidadLabel: string
  badgeOk?: boolean
  badgeLabel?: string
}) {
  const ok = badgeOk ?? marca.ok
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-lg font-medium" style={{ color: NAVY }}>
            {marca.marca}
          </span>
          {marca.tiene_medias_ropa ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Incluye medias/ropa
            </span>
          ) : null}
          <Badge ok={ok} label={badgeLabel} />
          {!open && hint ? (
            <span className="font-mono text-[10px] text-slate-400">{hint}</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {marca.modelos} modelos · Web {marca.pares_web.toLocaleString('es-PY')} · Dep{' '}
          {marca.pares_dep.toLocaleString('es-PY')} · {unidadLabel}
        </p>
      </div>
      <span className="text-slate-400" aria-hidden>
        {open ? '▴' : '▾'}
      </span>
    </button>
  )
}

/** 654 Calzado — grada = curva del modelo (pares). */
function MarcaAcordeonCalzado({
  marca,
  showFotos,
}: {
  marca: MarcaBloque
  showFotos: boolean
}) {
  const [open, setOpen] = useState(false)
  const nGradas = useMemo(() => gruposPorGrada(filasDeMarca(marca)).length, [marca])
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <MarcaHeader
        marca={marca}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        hint={nGradas > 0 ? `${nGradas} curva${nGradas === 1 ? '' : 's'} calzado` : undefined}
        unidadLabel="pares"
      />
      {open ? (
        <TablasMarcaPorGrada
          marca={marca}
          unidad="pares"
          showFotos={showFotos}
          proveedorId={654}
        />
      ) : null}
    </div>
  )
}

/** Cabecera grada horizontal de la marca (638 am_talle). */
function CabeceraGradaMarca638({
  grada,
}: {
  grada: { talla: string; talla_orden: number }[]
}) {
  if (grada.length === 0) {
    return (
      <p className="px-4 py-2 text-[11px] text-amber-800">
        Sin grada PPD en esta marca (falta am_talle / TC Tallas F9).
      </p>
    )
  }
  return (
    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Grada marca (PPD · am_talle)
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {grada.map((g, i) => (
          <span key={g.talla} className="inline-flex items-center gap-1">
            <span
              className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[12px] font-bold"
              style={{ color: NAVY }}
            >
              {g.talla}
            </span>
            {i < grada.length - 1 ? (
              <span className="text-[10px] text-slate-300" aria-hidden>
                |
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">
        Cantidad por talle = prendas ALM del modelo (Σ celdas = Web/Dep). Talles = grada PPD.
      </p>
    </div>
  )
}

/** 638 — marca: cabecera grada + filas Web/Dep con cantidades por talle. */
function MarcaAcordeonConfecciones({
  marca,
  showFotos,
}: {
  marca: MarcaBloque
  showFotos: boolean
}) {
  const [open, setOpen] = useState(false)
  const grada = marca.grada
  const sumWeb = marca.modelos_detalle.reduce((s, m) => s + m.web_pares, 0)
  const sumDep = marca.modelos_detalle.reduce((s, m) => s + m.dep_pares, 0)
  const aritOk = sumWeb === marca.pares_web && sumDep === marca.pares_dep

  const colWeb = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of grada) map.set(g.talla, 0)
    for (const m of marca.modelos_detalle) {
      for (const t of m.tallas) {
        const k = parseGradaAbierta638(t.talla)
        if (!map.has(k)) continue
        map.set(k, (map.get(k) || 0) + (t.stock_web || 0))
      }
    }
    return map
  }, [marca.modelos_detalle, grada])

  const colDep = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of grada) map.set(g.talla, 0)
    for (const m of marca.modelos_detalle) {
      for (const t of m.tallas) {
        const k = parseGradaAbierta638(t.talla)
        if (!map.has(k)) continue
        map.set(k, (map.get(k) || 0) + (t.stock_dep || 0))
      }
    }
    return map
  }, [marca.modelos_detalle, grada])

  const sumColWeb = Array.from(colWeb.values()).reduce((s, n) => s + n, 0)
  const sumColDep = Array.from(colDep.values()).reduce((s, n) => s + n, 0)
  const cellsOk = sumColWeb === sumWeb && sumColDep === sumDep

  const hint = !marca.ok_grada
    ? marca.ok_stock
      ? 'Stock OK · sin match PPD'
      : 'Stock FAIL · sin match PPD'
    : `grada ${grada.map((g) => g.talla).join(' · ') || '—'}`

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <MarcaHeader
        marca={marca}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        hint={!open ? hint : undefined}
        unidadLabel="prendas"
        badgeOk={marca.ok_stock && aritOk && cellsOk}
        badgeLabel={
          !aritOk || !cellsOk
            ? 'Σ FAIL'
            : marca.ok_stock
              ? marca.ok_grada
                ? 'OK'
                : 'Stock OK'
              : 'FAIL'
        }
      />
      {open ? (
        <div className="border-t border-slate-100">
          <CabeceraGradaMarca638 grada={grada} />
          {!aritOk || !cellsOk ? (
            <p className="bg-red-50 px-4 py-2 text-[11px] font-semibold text-red-700">
              Inconsistencia: cabecera Web/Dep {marca.pares_web}/{marca.pares_dep} · Σ modelos{' '}
              {sumWeb}/{sumDep} · Σ celdas {sumColWeb}/{sumColDep}.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-[10px] uppercase tracking-wide text-slate-500">
                  {showFotos ? <th className="px-2 py-2 text-left font-bold">Foto</th> : null}
                  <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left font-bold">
                    Modelo
                  </th>
                  <th className="px-2 py-2 text-left font-bold">Color</th>
                  <th className="px-2 py-2 text-left font-bold">Estilo</th>
                  <th className="px-1 py-2 text-center font-bold text-slate-400"> </th>
                  {grada.map((g) => (
                    <th
                      key={g.talla}
                      className="min-w-[2.25rem] px-1 py-2 text-center font-mono text-[12px] font-bold"
                      style={{ color: NAVY }}
                    >
                      {g.talla}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right font-bold">Tot</th>
                  <th className="px-2 py-2 text-center font-bold">OK</th>
                </tr>
              </thead>
              <tbody>
                {marca.modelos_detalle.map((m) => {
                  const byTalla = new Map(
                    m.tallas.map((t) => [parseGradaAbierta638(t.talla), t] as const),
                  )
                  const colorDesc =
                    m.color_nombre && m.color_nombre !== m.color_code ? m.color_nombre : null
                  const sumTalleWeb = m.tallas.reduce((s, t) => s + (t.stock_web || 0), 0)
                  const sumTalleDep = m.tallas.reduce((s, t) => s + (t.stock_dep || 0), 0)
                  const rowOk =
                    sumTalleWeb === m.web_pares &&
                    sumTalleDep === m.dep_pares &&
                    m.ok_stock &&
                    m.ok_grada
                  return (
                    <Fragment key={m.key}>
                      <tr className="border-t border-slate-200 bg-white">
                        {showFotos ? (
                          <td className="px-2 py-1.5 align-top" rowSpan={2}>
                            <MiniaturaFila
                              f={{
                                linea: m.linea,
                                referencia: m.referencia,
                                material: m.material,
                                color_code: m.color_code || '—',
                                color_nombre: m.color_nombre || m.color_code || '—',
                              }}
                              proveedorId={638}
                            />
                          </td>
                        ) : null}
                        <td className="sticky left-0 z-[1] bg-white px-3 py-1.5 align-top" rowSpan={2}>
                          <div
                            className="font-mono text-[12px] font-semibold"
                            style={{ color: NAVY }}
                          >
                            {m.linea}
                            {m.referencia ? ` · ref ${m.referencia}` : ''}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {!m.ok_grada ? 'sin PPD' : m.estilo !== '(sin estilo)' ? m.estilo : '—'}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 align-top" rowSpan={2}>
                          <span className="font-mono font-semibold" style={{ color: NAVY }}>
                            {m.color_code || '—'}
                          </span>
                          {colorDesc ? (
                            <div className="text-[10px] text-slate-500">{colorDesc}</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 align-top text-slate-600" rowSpan={2}>
                          {m.estilo && m.estilo !== '(sin estilo)' ? m.estilo : '—'}
                        </td>
                        <td className="px-1 py-1 text-center text-[10px] font-bold uppercase text-slate-400">
                          Web
                        </td>
                        {grada.map((g) => {
                          const t = byTalla.get(g.talla)
                          const n = t?.stock_web
                          return (
                            <td
                              key={`w-${m.key}-${g.talla}`}
                              className="px-1 py-1 text-center font-mono font-semibold"
                              style={{ color: n && n > 0 ? NAVY : undefined }}
                              title={t?.grada_carlos || undefined}
                            >
                              {t ? n : <span className="text-slate-300">·</span>}
                            </td>
                          )
                        })}
                        <td className="px-2 py-1 text-right font-mono font-semibold">{m.web_pares}</td>
                        <td className="px-2 py-1 text-center" rowSpan={2}>
                          <Badge
                            ok={rowOk}
                            label={m.ok_stock ? (m.ok_grada ? 'OK' : 'Grada') : 'Stock'}
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-slate-50 bg-slate-50/50">
                        <td className="px-1 py-1 text-center text-[10px] font-bold uppercase text-slate-400">
                          Dep
                        </td>
                        {grada.map((g) => {
                          const t = byTalla.get(g.talla)
                          const n = t?.stock_dep
                          const mismatch = t != null && t.stock_web !== t.stock_dep
                          return (
                            <td
                              key={`d-${m.key}-${g.talla}`}
                              className={`px-1 py-1 text-center font-mono ${
                                mismatch ? 'font-semibold text-red-600' : ''
                              }`}
                              title={t?.grada_carlos || undefined}
                            >
                              {t ? n : <span className="text-slate-300">·</span>}
                            </td>
                          )
                        })}
                        <td
                          className={`px-2 py-1 text-right font-mono ${
                            m.web_pares !== m.dep_pares ? 'font-semibold text-red-600' : ''
                          }`}
                        >
                          {m.dep_pares}
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td
                    className="sticky left-0 z-[1] bg-slate-50 px-3 py-2"
                    colSpan={showFotos ? 4 : 3}
                  >
                    Total marca
                  </td>
                  <td className="px-1 py-2 text-center text-[10px] uppercase text-slate-400">Σ</td>
                  {grada.map((g) => (
                    <td
                      key={`tot-${g.talla}`}
                      className="px-1 py-2 text-center font-mono"
                      style={{ color: NAVY }}
                    >
                      {colWeb.get(g.talla) || 0}
                      {colWeb.get(g.talla) !== colDep.get(g.talla) ? (
                        <span className="block text-[9px] text-red-600">
                          d{colDep.get(g.talla) || 0}
                        </span>
                      ) : null}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right font-mono" style={{ color: NAVY }}>
                    {sumWeb}/{sumDep}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Badge ok={aritOk && cellsOk && marca.ok_stock} label={cellsOk ? 'Σ' : 'Σ≠'} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AuditoriaLocalClient() {
  const [data, setData] = useState<AuditoriaLocalPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'Calzado' | 'Confecciones'>('Calzado')
  const [showAgg, setShowAgg] = useState(false)
  const [showFotos, setShowFotos] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/auditoria-local?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error')
      setData(json as AuditoriaLocalPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const ramo: RamoBloque | null = useMemo(() => {
    if (!data?.ramos?.length) return null
    return data.ramos.find((r) => r.tipo_v2 === tab) ?? null
  }, [data, tab])

  const huecosRamo = useMemo(() => {
    if (!data) return []
    const label = tab === 'Calzado' ? 'Calzado' : 'Confecciones'
    return data.huecos.filter((h) => h.tipo_v2 === label)
  }, [data, tab])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Solo local · no deploy
          </p>
          <h1 className="font-serif text-3xl font-light" style={{ color: NAVY }}>
            Estadísticas de Stock
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            654 curva · 638 talles (1·2·3 → P·M·G → 4·6·8…) · Dep ↔ Sano ↔ Web · solo local
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFotos((v) => !v)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
              showFotos
                ? 'border-transparent text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
            style={showFotos ? { backgroundColor: NAVY } : undefined}
            title="Miniaturas NIIF (sm) por modelo/color"
          >
            {showFotos ? 'Con fotos' : 'Sin fotos'}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: ORANGE }}
          >
            {loading ? 'Auditando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-5">
          <p className="text-xs text-slate-400">
            {data.nota} · {new Date(data.generado_en).toLocaleString('es-PY')}
          </p>

          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              data.ok
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : data.ok_stock
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-red-300 bg-red-50 text-red-900'
            }`}
          >
            {data.ok
              ? 'PASS — Stock Dep↔Web OK · grada 638 PPD/F9 OK.'
              : data.ok_stock && !data.ok_grada_638
                ? 'PASS stock Dep↔Web · FAIL grada 638 (sin match PPD am_talle / TC Tallas). Canónico: 1(1)1 · P(1)P — no talla 34–39 ALM.'
                : `FAIL stock — huecos: ${data.huecos.length} · Δ Web−Dep = ${data.totales.web_pares - data.totales.deposito_pares}`}
          </div>

          <div className="flex gap-2 border-b border-slate-200 pb-px">
            {(['Calzado', 'Confecciones'] as const).map((t) => {
              const r = data.ramos.find((x) => x.tipo_v2 === t)
              const active = tab === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'border border-b-white border-slate-200 bg-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  style={active ? { color: NAVY } : undefined}
                >
                  {t}
                  <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                    {r?.modelos ?? 0} · {(r?.pares_web ?? 0).toLocaleString('es-PY')}
                  </span>
                  {r && !r.ok_stock ? (
                    <span className="ml-1 text-[10px] font-bold text-red-600">STOCK</span>
                  ) : r && !r.ok_grada ? (
                    <span className="ml-1 text-[10px] font-bold text-amber-600">GRADA</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {ramo ? (
            <div className="space-y-4 rounded-b-xl rounded-tr-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Modelos web', ramo.modelos],
                  [tab === 'Calzado' ? 'Pares web' : 'Prendas web', ramo.pares_web],
                  [tab === 'Calzado' ? 'Pares dep' : 'Prendas dep', ramo.pares_dep],
                  ['Huecos stock', huecosRamo.length],
                ].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">{l}</p>
                    <p className="font-mono text-lg font-semibold" style={{ color: NAVY }}>
                      {Number(v).toLocaleString('es-PY')}
                    </p>
                  </div>
                ))}
              </div>

              {ramo.alerta_grada ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
                  <strong>Grada 638 (aviso único).</strong> {ramo.alerta_grada} Canónico:{' '}
                  {FAMILIAS_TALLE_638.join(' · ')}.
                </div>
              ) : null}

              <p className="text-xs text-slate-500">
                {tab === 'Calzado'
                  ? '654: grada = curva del modelo (pares). Cabecera por firma de curva; filas Web/Dep.'
                  : '638: cabecera grada marca · filas Web/Dep con cantidad por talle (Σ celdas = Tot ALM).'}
              </p>

              <div className="space-y-2">
                {ramo.marcas.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin marcas en este ramo.</p>
                ) : tab === 'Calzado' ? (
                  ramo.marcas.map((m) => (
                    <MarcaAcordeonCalzado key={m.marca} marca={m} showFotos={showFotos} />
                  ))
                ) : (
                  ramo.marcas.map((m) => (
                    <MarcaAcordeonConfecciones key={m.marca} marca={m} showFotos={showFotos} />
                  ))
                )}
              </div>

              {huecosRamo.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40">
                  <div className="border-b border-amber-100 px-4 py-2">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Huecos · {tab}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="text-[10px] uppercase text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Problema</th>
                          <th className="px-2 py-2">Marca</th>
                          <th className="px-2 py-2">L-R-M</th>
                          <th className="px-2 py-2 text-right">Dep</th>
                          <th className="px-2 py-2 text-right">Sano</th>
                          <th className="px-2 py-2 text-right">Web</th>
                        </tr>
                      </thead>
                      <tbody>
                        {huecosRamo.map((h) => (
                          <tr
                            key={`${h.linea}-${h.referencia}-${h.material}-${h.problema}`}
                            className="border-t border-amber-100/80"
                          >
                            <td className="px-3 py-2 font-medium text-red-700">
                              {PROBLEMA[h.problema]}
                            </td>
                            <td className="px-2 py-2">{h.marca}</td>
                            <td className="px-2 py-2 font-mono">
                              {h.linea}-{h.referencia}-{h.material}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">{h.deposito_pares}</td>
                            <td className="px-2 py-2 text-right font-mono">{h.sano_pares ?? '—'}</td>
                            <td className="px-2 py-2 text-right font-mono">{h.web_pares ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setShowAgg((v) => !v)}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline"
          >
            {showAgg ? 'Ocultar' : 'Ver'} agregados legacy (Tipo / marca / estilo)
          </button>
          {showAgg ? (
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Totales globales: Dep {data.totales.deposito_pares} · Sano {data.totales.sano_pares} ·
                Web {data.totales.web_pares}
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-[10px]">
                {JSON.stringify(
                  {
                    por_tipo_v2: data.por_tipo_v2,
                    por_marca: data.por_marca.slice(0, 30),
                    por_estilo: data.por_estilo,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          ) : null}
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : null}
    </div>
  )
}
