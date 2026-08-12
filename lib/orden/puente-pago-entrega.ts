/**
 * Puente Bazzar Web → Bancard + Delivery Bazzar
 * Bóveda Oro WEB · captura transacción · CHUSAR 2.5.1.27
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type PagoEstado =
  | 'PENDIENTE'
  | 'INICIADO'
  | 'PAGADO'
  | 'FALLIDO'
  | 'COORDINAR_MANUAL'

export type EntregaEstado =
  | 'PENDIENTE_COORDINACION'
  | 'HANDOFF_DELIVERY'
  | 'EN_RUTA'
  | 'ENTREGADO'
  | 'CONFORMIDAD_CLIENTE'
  | 'INCIDENCIA'

export type SnapshotTransaccion = {
  version: 1
  origen: 'BAZZAR_WEB'
  carrier: 'DELIVERY_BAZZAR'
  pago_proveedor: 'BANCARD'
  pedido_id: number
  total: number
  moneda: 'PYG'
  cliente: {
    id: number | null
    nombre: string
    email: string | null
    telefono: string | null
    direccion: string | null
    cedula?: string | null
  }
  lineas: Array<{
    combinacion_id: number | null
    linea_codigo: string
    referencia_codigo: string
    marca: string
    material_desc: string | null
    color_nombre: string | null
    talla_codigo: string | null
    cantidad: number
    precio_unitario: number
    imagen_url: string | null
    /** Stems para cascada NIIF (L-R-M-C) */
    imagen_niif?: {
      linea: string
      ref: string
      material?: string | null
      color?: string | null
    } | null
  }>
  entrega?: {
    lat: number | null
    lng: number | null
    label: string | null
    departamento: string | null
    ciudad: string | null
    distrito: string | null
  }
  politica: {
    atencion_agilidad: true
    conformidad_entrega: true
    nota: string
  }
  created_at: string
}

/** Extrae L-R-M-C del nombre de archivo en Storage (654: a-b-c-d.jpg). */
export function stemsNiifDesdeUrl(
  imagenUrl: string | null | undefined,
  lineaCodigo: string,
  refCodigo: string,
): NonNullable<SnapshotTransaccion['lineas'][number]['imagen_niif']> {
  const linea = String(lineaCodigo ?? '').trim()
  const ref = String(refCodigo ?? '').trim()
  let material: string | null = null
  let color: string | null = null
  const raw = String(imagenUrl ?? '')
  const marker = '/storage/v1/object/public/productos/'
  const idx = raw.indexOf(marker)
  let stem = ''
  if (idx >= 0) {
    try {
      stem = decodeURIComponent(raw.slice(idx + marker.length).split('?')[0] ?? '')
    } catch {
      stem = raw.slice(idx + marker.length).split('?')[0] ?? ''
    }
  }
  stem = stem
    .replace(/^(sm|md|lg|thumbs)\//i, '')
    .replace(/\.(jpe?g|png|webp)$/i, '')
  const parts = stem.split('-').filter(Boolean)
  if (parts.length >= 4) {
    material = parts[2] ?? null
    color = parts[3] ?? null
  }
  return { linea, ref, material, color }
}

export function buildSnapshotTransaccion(input: {
  pedidoId: number
  total: number
  cliente: SnapshotTransaccion['cliente']
  lineas: SnapshotTransaccion['lineas']
  entrega?: SnapshotTransaccion['entrega']
}): SnapshotTransaccion {
  return {
    version: 1,
    origen: 'BAZZAR_WEB',
    carrier: 'DELIVERY_BAZZAR',
    pago_proveedor: 'BANCARD',
    pedido_id: input.pedidoId,
    total: input.total,
    moneda: 'PYG',
    cliente: input.cliente,
    lineas: input.lineas,
    entrega: input.entrega,
    politica: {
      atencion_agilidad: true,
      conformidad_entrega: true,
      nota: '80% valor percibido = atención + agilidad de entrega (política Bazzar Web)',
    },
    created_at: new Date().toISOString(),
  }
}

/** Enriquecer pedido recién creado con campos Bóveda Oro WEB (si migraciones aplicadas). */
export async function sellarPedidoBobedaOroWeb(
  supabase: SupabaseClient,
  params: {
    pedidoId: number
    total: number
    direccion: string | null
    telefono: string | null
    snapshot: SnapshotTransaccion
    lat?: number | null
    lng?: number | null
  },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('pedido_web')
    .update({
      pago_estado: 'PENDIENTE',
      pago_proveedor: 'BANCARD',
      pago_monto: params.total,
      pago_moneda: 'PYG',
      entrega_estado: 'PENDIENTE_COORDINACION',
      entrega_carrier: 'DELIVERY_BAZZAR',
      entrega_direccion_snapshot: params.direccion,
      entrega_telefono_snapshot: params.telefono,
      entrega_lat: params.lat ?? null,
      entrega_lng: params.lng ?? null,
      snapshot_transaccion: params.snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.pedidoId)

  if (error) {
    // Migración aún no aplicada: no abortar el pedido
    console.warn('[bobeda-oro-web] sellar:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function marcarHandoffDelivery(
  supabase: SupabaseClient,
  pedidoId: number,
  ventana?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('pedido_web')
    .update({
      entrega_estado: 'HANDOFF_DELIVERY',
      entrega_ventana: ventana ?? null,
      entrega_handoff_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Simulación de pago (sin Bancard / Laura).
 * Marca PAGADO + pedido CONFIRMADO. Solo mientras no hay credenciales reales.
 */
export async function confirmarPagoSimulado(
  supabase: SupabaseClient,
  params: {
    pedidoId: number
    amount: number
    shopProcessId: string
  },
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('pedido_web')
    .update({
      estado: 'CONFIRMADO',
      pago_estado: 'PAGADO',
      pago_proveedor: 'BANCARD_SIM',
      pago_ref_externa: params.shopProcessId,
      pago_monto: params.amount,
      pago_moneda: 'PYG',
      pago_iniciado_at: now,
      pago_confirmado_at: now,
      updated_at: now,
    })
    .eq('id', params.pedidoId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
export function domicilioListoParaEdB(params: {
  telefono?: string | null
  lat?: number | null
  lng?: number | null
}): boolean {
  const tel = String(params.telefono ?? '').replace(/\D/g, '')
  const lat = Number(params.lat)
  const lng = Number(params.lng)
  return tel.length >= 8 && Number.isFinite(lat) && Number.isFinite(lng)
}

/**
 * Dispara EDB: marca handoff + sync one-way a delivery-bazzar (:3005).
 * Solo domicilio (modo único en simulación).
 */
export async function dispararEdBDomicilio(
  supabase: SupabaseClient,
  params: {
    pedidoId: number
    telefono?: string | null
    lat?: number | null
    lng?: number | null
    ventana?: string
  },
): Promise<{ ok: boolean; synced: boolean; nuevos?: number; error?: string }> {
  if (!domicilioListoParaEdB(params)) {
    return { ok: false, synced: false, error: 'Falta teléfono o punto en mapa' }
  }

  const handoff = await marcarHandoffDelivery(supabase, params.pedidoId, params.ventana)
  if (!handoff.ok) {
    return { ok: false, synced: false, error: handoff.error }
  }

  const edbBase =
    process.env.DELIVERY_BAZZAR_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_DELIVERY_BAZZAR_URL?.replace(/\/$/, '') ||
    'http://localhost:3005'

  try {
    const res = await fetch(`${edbBase}/api/envios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
      signal: AbortSignal.timeout(20000),
    })
    const data = (await res.json().catch(() => ({}))) as { nuevos?: number; error?: string }
    if (!res.ok) {
      console.warn('[edb] sync fail', data.error ?? res.status)
      return { ok: true, synced: false, error: data.error ?? `EDB ${res.status}` }
    }
    return { ok: true, synced: true, nuevos: data.nuevos ?? 0 }
  } catch (e) {
    console.warn('[edb] sync unreachable', e)
    return {
      ok: true,
      synced: false,
      error: 'Handoff OK · EDB no respondió (¿:3005 arriba?)',
    }
  }
}
