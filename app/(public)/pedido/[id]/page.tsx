import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ItemImagen } from './ItemImagen'

interface Props { params: { id: string } }

export default async function ConfirmacionPage({ params }: Props) {
  const { id } = params
  const supabase = createAdminClient()

  const { data: pedido } = await supabase
    .from('pedido_web')
    .select('*, pedido_web_detalle(*)')
    .eq('id', id)
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

  const fmtGs = (n: number) => new Intl.NumberFormat('es-PY').format(n)
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="max-w-2xl mx-auto py-8">

      {/* ── Éxito ── */}
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
          Te contactaremos al <span className="font-semibold text-slate-700">{pedido.cliente_telefono}</span> para coordinar la entrega
        </p>
      </div>

      {/* ── Card del pedido ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
             style={{ backgroundColor: '#1E3A5F' }}>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Número de pedido
            </p>
            <p className="text-white font-extrabold text-xl">#{String(pedido.id).padStart(6, '0')}</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold
                             px-3 py-1 rounded-full uppercase tracking-wide">
              {pedido.estado}
            </span>
            <p className="text-white/50 text-[10px] mt-1">{fmtDate(pedido.created_at)}</p>
          </div>
        </div>

        {/* Datos cliente */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-4">
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

        {/* Items */}
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

        {/* Total */}
        <div className="px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-slate-600">Total del pedido</span>
          <span className="text-2xl font-extrabold text-orange-500">
            Gs. {fmtGs(pedido.total)}
          </span>
        </div>
      </div>

      {/* Notas cliente */}
      {pedido.notas_cliente && (
        <div className="mt-4 bg-sky-50 border border-sky-100 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            Notas
          </p>
          <p className="text-sm text-slate-600">{pedido.notas_cliente}</p>
        </div>
      )}

      {/* Info tracking */}
      <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-700">¿Qué sigue?</p>
            <p className="text-xs text-orange-600 mt-0.5 leading-relaxed">
              Nuestro equipo revisará tu pedido y te contactará por WhatsApp en las próximas horas
              para coordinar el método de pago y la entrega.
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
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
          href={`https://wa.me/595XXXXXXXXX?text=${encodeURIComponent(`Hola! Acabo de hacer el pedido #${String(pedido.id).padStart(6,'0')} en Bazzar`)}`}
          target="_blank"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                     text-white transition-colors"
          style={{ backgroundColor: '#25D366' }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Consultar por WhatsApp
        </Link>
      </div>
    </div>
  )
}
