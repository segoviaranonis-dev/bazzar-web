'use client'

import { useRouter } from 'next/navigation'
import { ProductImage } from '@/components/ProductImage'
import { useCart } from './CartContext'

const NAVY   = '#1E3A5F'
const ORANGE = '#F97316'

export function CartDrawer() {
  const router = useRouter()
  const { items, total, count, open, setOpen, removeItem, updateQty, clear } = useCart()
  const fmtGs = (n: number) => new Intl.NumberFormat('es-PY').format(n)

  function irCheckout() {
    setOpen(false)
    router.push('/checkout')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-[2px]"
          style={{ backgroundColor: 'rgba(30,58,95,0.45)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[390px] z-50
                    flex flex-col bg-white
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-8px 0 40px rgba(30,58,95,0.18)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
             style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 style={{ color: ORANGE }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="font-bold text-base text-white">
              Mi Pedido
              {count > 0 && (
                <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: ORANGE }}>
                  {count} {count === 1 ? 'par' : 'pares'}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="touch-target flex items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-sky-50">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: NAVY }}>Tu pedido está vacío</p>
              <p className="text-xs text-slate-400 mt-1">Elegí una talla para agregar</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.key}
                className="flex gap-3 bg-white rounded-xl p-3 border border-slate-100"
                style={{ boxShadow: '0 1px 4px rgba(30,58,95,0.06)' }}>
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  <ProductImage
                    item={{
                      linea_codigo: item.linea_codigo,
                      referencia_codigo: item.referencia_codigo,
                      material_code: item.material_code,
                      color_code: item.color_code,
                      color_nombre: item.color_nombre,
                      ppd_color_codigo: item.ppd_color_codigo,
                      proveedor_importacion_id: item.proveedor_importacion_id,
                      imagen_url: item.imagen_url,
                    }}
                    candidates={
                      item.imagen_candidates?.length
                        ? item.imagen_candidates
                        : item.imagen_url
                          ? [item.imagen_url]
                          : undefined
                    }
                    alt={`${item.linea_codigo}-${item.referencia_codigo}`}
                    variant="thumb"
                    className="h-full w-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider"
                     style={{ color: ORANGE }}>{item.marca}</p>
                  <p className="font-semibold text-sm" style={{ color: NAVY }}>
                    <span>{item.linea_codigo}</span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span style={{ color: ORANGE }}>{item.referencia_codigo}</span>
                  </p>
                  <p className="text-xs text-slate-400 truncate">{item.material_descripcion} · {item.color_nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-slate-700">
                      T. {item.talla_codigo}
                    </span>
                    {item.precio_web ? (
                      <span className="text-xs font-bold" style={{ color: ORANGE }}>
                        Gs. {fmtGs(item.precio_web)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Consultar</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => removeItem(item.key)}
                    className="touch-target flex items-center justify-center rounded-lg
                               text-slate-400 hover:text-red-400 hover:bg-red-50
                               transition-colors text-xl leading-none"
                  >×</button>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => updateQty(item.key, -1)}
                      className="touch-target flex items-center justify-center rounded-md text-base font-bold
                                 hover:bg-white transition-colors"
                      style={{ color: NAVY }}
                    >−</button>
                    <span className="text-sm font-bold min-w-[1.5rem] text-center"
                          style={{ color: NAVY }}>{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(item.key, 1)}
                      disabled={item.cantidad >= item.stock_web}
                      className="touch-target flex items-center justify-center rounded-md text-base font-bold
                                 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: NAVY }}
                    >+</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-100 bg-white px-5 pt-4 pb-5 space-y-4 shrink-0">
            {items.some(i => !i.precio_web) && (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200
                             rounded-lg px-3 py-2 text-center">
                Precio a confirmar — el total exacto se calcula al finalizar
              </p>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total pedido</span>
              <span className="text-xl font-extrabold" style={{ color: NAVY }}>
                {total > 0 ? `Gs. ${fmtGs(total)}` : '—'}
              </span>
            </div>
            <button
              onClick={irCheckout}
              className="flex items-center justify-center gap-2 w-full
                         text-white font-bold py-3.5 rounded-xl transition-all"
              style={{ backgroundColor: ORANGE }}
            >
              Ir a confirmar pedido
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={() => clear()}
              className="w-full text-xs text-slate-400 hover:text-red-400 transition-colors py-1"
            >Vaciar pedido</button>
          </div>
        )}
      </div>
    </>
  )
}

/** Pedido — icono bolsa (inspiración retail moda); badge si hay ítems. */
export function CartButton() {
  const { count, setOpen } = useCart()

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="touch-target relative flex items-center justify-center rounded-lg text-neutral-800 transition hover:text-neutral-950"
      aria-label={count > 0 ? `Ver pedido (${count})` : 'Ver pedido'}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      {count > 0 && (
        <span
          className="absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
          style={{ backgroundColor: ORANGE }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
