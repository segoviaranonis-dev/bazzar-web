import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPedidoToken } from '@/lib/security/pedido-token'
import { adminWhatsAppUrl } from '@/lib/whatsapp'
import { dispararEdBDomicilio, domicilioListoParaEdB } from '@/lib/orden/puente-pago-entrega'
import Link from 'next/link'
import { ItemImagen } from './ItemImagen'
import { PuentePagoEntrega } from './PuentePagoEntrega'

interface Props {
  params: { id: string }
  searchParams: { t?: string; pago?: string }
}

export default async function ConfirmacionPage({ params, searchParams }: Props) {
  const { id } = params
  const token = searchParams.t

  if (!isValidPedidoToken(token)) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <p className="text-slate-600 font-semibold">Enlace de pedido inválido o incompleto.</p>
        <p className="text-slate-400 text-sm mt-2">Usá el enlace que recibiste al confirmar tu pedido.</p>
        <Link href="/catalogo" className="text-orange-500 font-semibold mt-4 inline-block">
          ← Volver al catálogo
        </Link>
      </div>
    )
  }

  const supabase = createAdminClient()
  const { data: pedido } = await supabase
    .from('pedido_web')
    .select('*, pedido_web_detalle(*)')
    .eq('id', id)
    .eq('token_acceso', token)
    .single()

  if (!pedido) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <p className="text-slate-400">Pedido no encontrado.</p>
        <Link href="/catalogo" className="text-orange-500 font-semibold mt-4 inline-block">
          ← Volver al catálogo
        </Link>
      </div>
    )
  }

  // EDB: disparo servidor (no UI cliente). Si faltaba handoff y hay teléfono+mapa → sync.
  const tel =
    (pedido.entrega_telefono_snapshot as string | null) ||
    (pedido.cliente_telefono as string | null)
  const lat = pedido.entrega_lat as number | null
  const lng = pedido.entrega_lng as number | null
  if (
    pedido.entrega_estado !== 'HANDOFF_DELIVERY' &&
    domicilioListoParaEdB({ telefono: tel, lat, lng })
  ) {
    await dispararEdBDomicilio(supabase, {
      pedidoId: Number(pedido.id),
      telefono: tel,
      lat,
      lng,
    })
  }

  const fmtGs = (n: number) => new Intl.NumberFormat('es-PY').format(n)
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const waText = `Hola! Acabo de hacer el pedido #${String(pedido.id).padStart(6, '0')} en Bazzar`

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold" style={{ color: '#1E3A5F' }}>
          ¡Pedido registrado!
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Pedido en Bóveda Oro WEB · entrega a domicilio en curso (EDB)
        </p>
        <p className="text-slate-400 mt-1 text-xs">
          Contacto: <span className="font-semibold text-slate-600">{pedido.cliente_telefono}</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between"
             style={{ backgroundColor: '#1E3A5F' }}>
          <div>
            <p className="text-slate-300 text-xs font-medium uppercase tracking-wider">
              Número de pedido
            </p>
            <p className="text-white font-extrabold text-xl">#{String(pedido.id).padStart(6, '0')}</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold
                             px-3 py-1 rounded-full uppercase tracking-wide">
              {pedido.estado}
            </span>
            <p className="text-slate-400 text-[10px] mt-1">{fmtDate(pedido.created_at)}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Cliente</p>
            <p className="text-sm font-semibold" style={{ color: '#1E3A5F' }}>{pedido.cliente_nombre}</p>
            <p className="text-xs text-slate-500">{pedido.cliente_email}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Entrega</p>
            <p className="text-sm font-semibold" style={{ color: '#1E3A5F' }}>{pedido.cliente_telefono}</p>
            <p className="text-xs text-slate-500 leading-tight">{pedido.cliente_direccion}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3 border-b border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2">
            Artículos ({pedido.pedido_web_detalle?.length ?? 0})
          </p>
          {pedido.pedido_web_detalle?.map((d: {
            id: number; marca?: string; linea_codigo?: string; referencia_codigo?: string;
            color_nombre?: string; talla_codigo?: string; cantidad: number;
            precio_unitario: number; imagen_url?: string;
            snapshot_json?: { referencia_descripcion?: string }
          }) => (
            <div key={d.id} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                {d.imagen_url ? (
                  <ItemImagen src={d.imagen_url} alt={d.referencia_codigo ?? ''} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-orange-500 uppercase">{d.marca}</p>
                <p className="text-sm font-semibold" style={{ color: '#1E3A5F' }}>
                  <span>{d.linea_codigo}</span>
                  <span className="text-slate-300 mx-1">·</span>
                  <span style={{ color: '#F97316' }}>{d.referencia_codigo}</span>
                </p>
                {d.snapshot_json?.referencia_descripcion && (
                  <p className="text-[10px] text-slate-400 truncate">
                    {d.snapshot_json.referencia_descripcion}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {d.color_nombre} · T.{d.talla_codigo} · x{d.cantidad}
                </p>
              </div>
              <p className="text-sm font-bold text-orange-500 shrink-0">
                {d.precio_unitario > 0
                  ? `Gs. ${fmtGs(d.precio_unitario * d.cantidad)}`
                  : '—'}
              </p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-slate-600">Total del pedido</span>
          <span className="text-2xl font-extrabold text-orange-500">
            Gs. {fmtGs(pedido.total)}
          </span>
        </div>
      </div>

      {pedido.notas_cliente && (
        <div className="mt-4 bg-sky-50 border border-sky-100 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">Notas</p>
          <p className="text-sm text-slate-600">{pedido.notas_cliente}</p>
        </div>
      )}

      <PuentePagoEntrega
        pedidoId={Number(pedido.id)}
        token={String(token)}
        total={Number(pedido.total) || 0}
        pagoEstado={pedido.pago_estado ?? null}
        autoIniciarPago={searchParams.pago === 'auto' || searchParams.pago === '1'}
        pagoQuery={searchParams.pago ?? null}
      />

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link
          href="/catalogo"
          className="flex-1 text-center py-3 rounded-xl font-semibold text-sm
                     border border-slate-200 bg-white text-slate-600
                     hover:bg-slate-50 transition-colors"
        >
          Seguir comprando
        </Link>
        <Link
          href={adminWhatsAppUrl(waText)}
          target="_blank"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                     text-white transition-colors"
          style={{ backgroundColor: '#25D366' }}
        >
          Consultar por WhatsApp
        </Link>
      </div>
    </div>
  )
}
