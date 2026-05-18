'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const ALM_WEB_01 = 1

// ── Validación de campos del cliente ────────────────────────────────────────
const CEDULA_RE  = /^[0-9]{5,15}$/
const EMAIL_RE   = /^[^\s@]{1,64}@[^\s@]{1,255}$/
const PHONE_RE   = /^[0-9+\-\s()]{6,20}$/

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
  combinacion_id?: number       // puede faltar en items de localStorage pre-fix
  stock_web?: number
  linea_id?: number             // opcional para tolerar localStorage pre-018
  linea_codigo: string
  referencia_id?: number
  referencia_codigo: string
  referencia_descripcion: string
  marca: string
  material_descripcion: string
  color_nombre: string
  talla_codigo: string
  imagen_url: string
  precio_web: number | null     // precio del carrito — se re-valida en servidor
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

export interface ClienteData {
  cedula:    string
  nombre:    string
  apellido:  string | null
  email:     string | null
  telefono:  string | null
  direccion: string | null
}

export interface ResultadoCheckout {
  ok:        boolean
  pedido_id?: number
  error?:    string
}

/* ── Buscar cliente por cédula (para autocomplete) ── */
export async function buscarClientePorCedula(cedula: string): Promise<ClienteData | null> {
  const c = cedula.trim()
  if (!CEDULA_RE.test(c)) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cliente_web')
    .select('cedula, nombre, apellido, email, telefono, direccion')
    .eq('cedula', c)
    .single()
  return data ?? null
}

/* ── Crear pedido completo ── */
export async function crearPedido(
  datos: DatosCheckout,
  items: ItemCheckout[]
): Promise<ResultadoCheckout> {
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

  // ── 1. RESOLVER combinacion_id y VALIDAR PRECIOS DESDE LA BD ─────────────
  // Consultar SOLO los referencia_codigo del carrito (evita traer toda la vista).
  // Supabase tiene límite de 1000 filas por query — filtrar es obligatorio.
  const referencias = Array.from(new Set(items.map(i => i.referencia_codigo)))

  const { data: stockRows, error: stockError } = await supabase
    .from('v_stock_web')
    .select('*')                          // select(*) para no asumir nombres de columna
    .in('referencia_codigo', referencias)

  if (stockError) {
    console.error('[checkout] v_stock_web error:', stockError.message, stockError.code)
    return { ok: false, error: 'Error al verificar productos. Intentá nuevamente.' }
  }

  if (!stockRows?.length) {
    return { ok: false, error: 'Los productos ya no están disponibles. Recargá el catálogo.' }
  }

  // Resolver cada item: combinacion_id, linea_id, referencia_id y precio desde la BD
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
      r['talla_codigo']      === item.talla_codigo
    ) as Record<string, unknown> | undefined

    if (!fila) {
      return {
        ok: false,
        error: `"${item.referencia_codigo} T.${item.talla_codigo}" ya no tiene stock. Vaciá el carrito y volvé a agregar.`,
      }
    }

    const precio = fila['precio_web'] as number | null
    if (!precio) {
      // Sin precio en BD: igual creamos el pedido con precio 0 y nota admin
      console.warn(`[checkout] precio_web null para combinacion ${fila['combinacion_id']}`)
    }

    itemsResueltos.push({
      ...item,
      combinacion_id: fila['combinacion_id'] as number,
      linea_id:       fila['linea_id']       as number,
      referencia_id:  fila['referencia_id']  as number,
      precio_servidor: precio ?? 0,
    })
  }

  // ── 2. TOTAL CON PRECIOS DEL SERVIDOR ────────────────────────────────────
  const total = itemsResueltos.reduce((s, i) => s + i.precio_servidor * i.cantidad, 0)

  // ── 3. UPSERT CLIENTE ────────────────────────────────────────────────────
  const { data: cliente, error: errCliente } = await supabase
    .from('cliente_web')
    .upsert({
      cedula:     datos.cedula.trim(),
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
    console.error('[checkout] cliente_web upsert:', errCliente?.message)
    return { ok: false, error: 'Error al registrar cliente. Intentá nuevamente.' }
  }

  // ── 4. CABECERA DEL PEDIDO ───────────────────────────────────────────────
  const { data: pedido, error: errPedido } = await supabase
    .from('pedido_web')
    .insert({
      almacen_id:        ALM_WEB_01,
      estado:            'PENDIENTE',
      cliente_web_id:    cliente.id,
      cliente_nombre:    `${datos.nombre} ${datos.apellido ?? ''}`.trim(),
      cliente_email:     datos.email?.trim()     || null,
      cliente_telefono:  datos.telefono?.trim()  || null,
      cliente_direccion: datos.direccion?.trim() || null,
      notas_cliente:     datos.notas             || null,
      total,
    })
    .select('id')
    .single()

  if (errPedido || !pedido) {
    console.error('[checkout] pedido_web insert:', errPedido?.message)
    return { ok: false, error: 'Error al registrar el pedido. Intentá nuevamente.' }
  }

  // ── 5. RESERVAR STOCK ATÓMICAMENTE ───────────────────────────────────────
  const sinStock: string[] = []
  for (const item of itemsResueltos) {
    const { data: ok, error: errRpc } = await supabase.rpc('reservar_stock', {
      p_combinacion_id: item.combinacion_id,
      p_cantidad:       item.cantidad,
      p_almacen_id:     ALM_WEB_01,
      p_pedido_id:      pedido.id,
    })
    if (errRpc) console.error('[checkout] reservar_stock:', errRpc.message)
    if (!ok) sinStock.push(`${item.referencia_codigo} T.${item.talla_codigo}`)
  }

  if (sinStock.length > 0) {
    await supabase.from('pedido_web').delete().eq('id', pedido.id)
    return {
      ok: false,
      error: `Sin stock para: ${sinStock.join(', ')}. Otro cliente se adelantó. Revisá tu carrito.`,
    }
  }

  // ── 6. DETALLES DEL PEDIDO (incluye linea_id / referencia_id, estándar 018) ─
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

  const { error: errDetalle } = await supabase
    .from('pedido_web_detalle')
    .insert(detalles)

  if (errDetalle) {
    console.error('[checkout] detalle insert:', errDetalle.message)
    await supabase.from('pedido_web').delete().eq('id', pedido.id)
    return { ok: false, error: 'Error al guardar artículos. Intentá nuevamente.' }
  }

  return { ok: true, pedido_id: pedido.id }
}
