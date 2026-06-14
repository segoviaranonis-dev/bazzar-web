'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, pruneRateLimitStore } from '@/lib/security/rate-limit'
import { generatePedidoToken } from '@/lib/security/pedido-token'

const CEDULA_RE  = /^[0-9]{5,15}$/
const EMAIL_RE   = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const PHONE_RE   = /^[0-9+\-\s()]{6,20}$/

async function clientIpKey(suffix: string): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
  return `${ip}:${suffix}`
}

async function enforceRateLimit(suffix: string, max: number, windowMs: number): Promise<string | null> {
  pruneRateLimitStore()
  const key = await clientIpKey(suffix)
  const { ok, retryAfterSec } = checkRateLimit(key, max, windowMs)
  if (!ok) {
    return `Demasiados intentos. Esperá ${retryAfterSec ?? 60} segundos.`
  }
  return null
}

function validarDatos(d: DatosCheckout): string | null {
  if (!CEDULA_RE.test(d.cedula.trim()))
    return 'Cédula inválida (solo números, 5-15 dígitos).'
  if (!d.nombre.trim() || d.nombre.trim().length > 80)
    return 'Nombre inválido (máx. 80 caracteres).'
  if (d.apellido && d.apellido.trim().length > 80)
    return 'Apellido inválido (máx. 80 caracteres).'
  if (!EMAIL_RE.test((d.email ?? '').trim()))
    return 'Email inválido.'
  if (!PHONE_RE.test((d.telefono ?? '').trim()))
    return 'Teléfono inválido.'
  if (!d.direccion?.trim() || d.direccion.trim().length > 200)
    return 'Dirección inválida (máx. 200 caracteres).'
  if (d.notas && d.notas.length > 500)
    return 'Notas demasiado largas (máx. 500 caracteres).'
  return null
}

export interface ItemCheckout {
  key: string
  combinacion_id?: number
  stock_web?: number
  linea_id?: number
  linea_codigo: string
  referencia_id?: number
  referencia_codigo: string
  referencia_descripcion: string
  marca: string
  material_descripcion: string
  color_nombre: string
  talla_codigo: string
  imagen_url: string
  precio_web: number | null
  cantidad: number
}

export interface DatosCheckout {
  cedula:    string
  nombre:    string
  apellido?: string
  email:     string
  telefono:  string
  direccion: string
  notas?:    string
}

/** Solo datos no sensibles para autocomplete en checkout */
export interface ClienteAutocomplete {
  cedula:   string
  nombre:   string
  apellido: string | null
}

export interface ResultadoCheckout {
  ok:             boolean
  pedido_id?:     number
  token_acceso?:  string
  error?:         string
}

async function resolveAlmacenWebId(supabase: ReturnType<typeof createAdminClient>): Promise<number | null> {
  const { data } = await supabase
    .from('almacen')
    .select('id')
    .eq('nombre', 'ALM_WEB_01')
    .single()
  return data?.id ?? null
}

async function abortPedido(
  supabase: ReturnType<typeof createAdminClient>,
  pedidoId: number,
) {
  await supabase.rpc('liberar_stock_reserva', { p_pedido_id: pedidoId })
  await supabase.from('pedido_web').delete().eq('id', pedidoId)
}

/** Autocomplete por cédula — solo nombre/apellido; rate-limited */
export async function buscarClientePorCedula(cedula: string): Promise<ClienteAutocomplete | null> {
  const rateErr = await enforceRateLimit('buscar-cedula', 20, 60_000)
  if (rateErr) return null

  const c = cedula.replace(/\D/g, '').trim()
  if (!CEDULA_RE.test(c)) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cliente_web')
    .select('cedula, nombre, apellido')
    .eq('cedula', c)
    .maybeSingle()

  if (!data) return null
  return { cedula: data.cedula, nombre: data.nombre, apellido: data.apellido }
}

export async function crearPedido(
  datos: DatosCheckout,
  items: ItemCheckout[],
): Promise<ResultadoCheckout> {
  const rateErr = await enforceRateLimit('crear-pedido', 8, 60_000)
  if (rateErr) return { ok: false, error: rateErr }

  if (!items.length) return { ok: false, error: 'El pedido está vacío' }
  if (items.some(i => i.cantidad <= 0)) {
    return { ok: false, error: 'Cantidad inválida en uno o más artículos.' }
  }
  if (items.length > 50) {
    return { ok: false, error: 'El pedido excede el límite de artículos permitidos.' }
  }

  const errorValidacion = validarDatos(datos)
  if (errorValidacion) return { ok: false, error: errorValidacion }

  const supabase = createAdminClient()
  const almacenId = await resolveAlmacenWebId(supabase)
  if (!almacenId) {
    return { ok: false, error: 'Almacén web no disponible. Contactá al administrador.' }
  }

  const referencias = Array.from(new Set(items.map(i => i.referencia_codigo)))
  const { data: stockRows, error: stockError } = await supabase
    .from('v_stock_web')
    .select('*')
    .in('referencia_codigo', referencias)

  if (stockError) {
    console.error('[checkout] v_stock_web:', stockError.message)
    return { ok: false, error: 'Error al verificar productos. Intentá nuevamente.' }
  }
  if (!stockRows?.length) {
    return { ok: false, error: 'Los productos ya no están disponibles. Recargá el catálogo.' }
  }

  type ItemResuelto = ItemCheckout & {
    combinacion_id: number
    linea_id: number
    referencia_id: number
    precio_servidor: number
  }
  const itemsResueltos: ItemResuelto[] = []

  for (const item of items) {
    const fila = stockRows.find((r: Record<string, unknown>) =>
      r['referencia_codigo'] === item.referencia_codigo &&
      r['color_nombre']      === item.color_nombre      &&
      String(r['talla_codigo']) === String(item.talla_codigo)
    ) as Record<string, unknown> | undefined

    if (!fila) {
      return {
        ok: false,
        error: `"${item.referencia_codigo} T.${item.talla_codigo}" ya no tiene stock. Vaciá el carrito y volvé a agregar.`,
      }
    }

    const precio = Number(fila['precio_web'] ?? 0)
    if (!precio || precio <= 0) {
      return {
        ok: false,
        error: 'Precio no disponible en catálogo. Recargá la página o contactanos por WhatsApp.',
      }
    }

    const estadoSano = fila['stock_sano_estado'] as string | null | undefined
    if (estadoSano === 'SIN_PROTOCOLO') {
      return {
        ok: false,
        error: `"${item.referencia_codigo}" pendiente de protocolo Stock Sano. Contactanos por WhatsApp.`,
      }
    }

    itemsResueltos.push({
      ...item,
      combinacion_id:  fila['combinacion_id'] as number,
      linea_id:        fila['linea_id'] as number,
      referencia_id:   fila['referencia_id'] as number,
      precio_servidor: precio,
    })
  }

  const total = itemsResueltos.reduce((s, i) => s + i.precio_servidor * i.cantidad, 0)
  const tokenAcceso = generatePedidoToken()

  const { data: cliente, error: errCliente } = await supabase
    .from('cliente_web')
    .upsert({
      cedula:     datos.cedula.replace(/\D/g, '').trim(),
      nombre:     datos.nombre.trim(),
      apellido:   datos.apellido?.trim()  || null,
      email:      datos.email?.trim()     || null,
      telefono:   datos.telefono?.trim()  || null,
      direccion:  datos.direccion?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cedula' })
    .select('id')
    .single()

  if (errCliente || !cliente) {
    console.error('[checkout] cliente_web:', errCliente?.message)
    return { ok: false, error: 'Error al registrar cliente. Intentá nuevamente.' }
  }

  const { data: pedido, error: errPedido } = await supabase
    .from('pedido_web')
    .insert({
      almacen_id:        almacenId,
      estado:            'PENDIENTE',
      cliente_web_id:    cliente.id,
      cliente_nombre:    `${datos.nombre} ${datos.apellido ?? ''}`.trim(),
      cliente_email:     datos.email?.trim()     || null,
      cliente_telefono:  datos.telefono?.trim()  || null,
      cliente_direccion: datos.direccion?.trim() || null,
      notas_cliente:     datos.notas             || null,
      total,
      token_acceso:      tokenAcceso,
    })
    .select('id')
    .single()

  if (errPedido || !pedido) {
    console.error('[checkout] pedido_web:', errPedido?.message)
    return { ok: false, error: 'Error al registrar el pedido. Intentá nuevamente.' }
  }

  const sinStock: string[] = []
  for (const item of itemsResueltos) {
    const { data: ok, error: errRpc } = await supabase.rpc('reservar_stock', {
      p_combinacion_id: item.combinacion_id,
      p_cantidad:       item.cantidad,
      p_almacen_id:     almacenId,
      p_pedido_id:      pedido.id,
    })
    if (errRpc) console.error('[checkout] reservar_stock:', errRpc.message)
    if (!ok) sinStock.push(`${item.referencia_codigo} T.${item.talla_codigo}`)
  }

  if (sinStock.length > 0) {
    await abortPedido(supabase, pedido.id)
    return {
      ok: false,
      error: `Sin stock para: ${sinStock.join(', ')}. Otro cliente se adelantó. Revisá tu carrito.`,
    }
  }

  const detalles = itemsResueltos.map(item => ({
    pedido_id:         pedido.id,
    combinacion_id:    item.combinacion_id,
    cantidad:          item.cantidad,
    precio_unitario:   item.precio_servidor,
    linea_id:          item.linea_id,
    linea_codigo:      item.linea_codigo,
    referencia_id:     item.referencia_id,
    referencia_codigo: item.referencia_codigo,
    color_nombre:      item.color_nombre,
    material_desc:     item.material_descripcion,
    talla_codigo:      item.talla_codigo,
    marca:             item.marca,
    imagen_url:        item.imagen_url,
    snapshot_json: {
      key:                    item.key,
      referencia_descripcion: item.referencia_descripcion,
    },
  }))

  const { error: errDetalle } = await supabase.from('pedido_web_detalle').insert(detalles)

  if (errDetalle) {
    console.error('[checkout] detalle:', errDetalle.message)
    await abortPedido(supabase, pedido.id)
    return { ok: false, error: 'Error al guardar artículos. Intentá nuevamente.' }
  }

  return { ok: true, pedido_id: pedido.id, token_acceso: tokenAcceso }
}
