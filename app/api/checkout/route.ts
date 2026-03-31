import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DatosPedido, ItemCarrito } from '@/types/bazzar'

export async function POST(request: Request) {
  try {
    const { items, datos }: { items: ItemCarrito[]; datos: DatosPedido } = await request.json()
    if (!items?.length || !datos) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const supabase = await createClient()
    const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)

    const { data: almacen } = await supabase.from('almacen').select('id').eq('nombre', 'ALM_WEB_01').single()
    if (!almacen) return NextResponse.json({ error: 'Almacén no disponible' }, { status: 500 })

    const { data: pedido, error: errPedido } = await supabase
      .from('pedido_web')
      .insert({ almacen_id: almacen.id, cliente_nombre: datos.cliente_nombre,
        cliente_email: datos.cliente_email, cliente_telefono: datos.cliente_telefono,
        cliente_direccion: datos.cliente_direccion, notas_cliente: datos.notas_cliente,
        total, estado: 'PENDIENTE' })
      .select('id').single()

    if (errPedido || !pedido) return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })

    // Reservar stock por ítem — función atómica first-click-wins
    const sinStock: ItemCarrito[] = []
    for (const item of items) {
      const { data: ok } = await supabase.rpc('reservar_stock', {
        p_combinacion_id: item.combinacion_id,
        p_cantidad: item.cantidad,
        p_almacen_id: almacen.id,
        p_pedido_id: pedido.id,
      })
      if (!ok) sinStock.push(item)
    }

    if (sinStock.length > 0) {
      await supabase.from('pedido_web').update({ estado: 'RECHAZADO', notas_admin: 'Stock agotado al confirmar' }).eq('id', pedido.id)
      return NextResponse.json({ error: 'sin_stock', items_sin_stock: sinStock.map(i => i.referencia_codigo) }, { status: 409 })
    }

    await supabase.from('pedido_web_detalle').insert(
      items.map(i => ({ pedido_id: pedido.id, combinacion_id: i.combinacion_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
    )

    const adminWa = process.env.ADMIN_WHATSAPP ?? ''
    const resumen = items.map(i => `• ${i.referencia_descripcion ?? i.referencia_codigo} T${i.talla_codigo} x${i.cantidad}`).join('%0A')
    const waLink = `https://wa.me/${adminWa}?text=Nuevo+pedido+%23${pedido.id}%0A${resumen}%0ATotal:+Gs.+${total.toLocaleString('es-PY')}`

    await supabase.from('pedido_web').update({ simulacion_pago_enviada: true }).eq('id', pedido.id)

    return NextResponse.json({ ok: true, pedido_id: pedido.id, wa_link: waLink })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
