'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from './CartContext'
import { buscarClientePorCedula, crearPedido } from '@/app/actions/checkout'
import type { ClienteData } from '@/app/actions/checkout'

const NAVY   = '#1E3A5F'
const ORANGE = '#F97316'

export function CartDrawer() {
  const router = useRouter()
  const { items, total, count, open, setOpen, removeItem, updateQty, clear } = useCart()
  const fmtGs = (n: number) => new Intl.NumberFormat('es-PY').format(n)

  // ── Estado identificación cliente ──
  const [cedula,           setCedula]           = useState('')
  const [buscando,         setBuscando]         = useState(false)
  const [clienteOk,        setClienteOk]        = useState<ClienteData | null>(null)
  const [esNuevo,          setEsNuevo]          = useState(false)
  const [nuevoNombre,      setNuevoNombre]      = useState('')
  const [nuevoTelefono,    setNuevoTelefono]    = useState('')
  const [procesando,       setProcesando]       = useState(false)
  const [errorMsg,         setErrorMsg]         = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpiar cliente al vaciar carrito
  useEffect(() => {
    if (items.length === 0) resetCliente()
  }, [items.length])

  function resetCliente() {
    setCedula(''); setClienteOk(null); setEsNuevo(false)
    setNuevoNombre(''); setNuevoTelefono(''); setErrorMsg(null)
  }

  // Debounce búsqueda cédula
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setClienteOk(null); setEsNuevo(false); setErrorMsg(null)

    if (cedula.trim().length < 5) { setBuscando(false); return }

    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      const found = await buscarClientePorCedula(cedula.trim())
      setBuscando(false)
      if (found) {
        setClienteOk(found)
        setEsNuevo(false)
      } else {
        setClienteOk(null)
        setEsNuevo(true)
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cedula])

  // Habilitado cuando hay cliente identificado o nuevo con datos mínimos
  const clienteListo = clienteOk !== null ||
    (esNuevo && nuevoNombre.trim().length >= 2 && nuevoTelefono.trim().length >= 6)

  async function handleFinalizar() {
    if (!clienteListo || procesando) return
    setProcesando(true); setErrorMsg(null)

    const datos = clienteOk ? {
      cedula:    clienteOk.cedula,
      nombre:    clienteOk.nombre,
      apellido:  clienteOk.apellido ?? undefined,
      email:     clienteOk.email     ?? '',
      telefono:  clienteOk.telefono  ?? '',
      direccion: clienteOk.direccion ?? '',
    } : {
      cedula:   cedula.trim(),
      nombre:   nuevoNombre.trim(),
      telefono: nuevoTelefono.trim(),
      email:    '',
      direccion:'',
    }

    const result = await crearPedido(datos, items)
    if (result.ok && result.pedido_id) {
      clear()
      setOpen(false)
      resetCliente()
      router.push(`/pedido/${result.pedido_id}`)
    } else {
      setErrorMsg(result.error ?? 'Error al procesar el pedido. Intentá de nuevo.')
      setProcesando(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-[2px]"
          style={{ backgroundColor: 'rgba(30,58,95,0.45)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[390px] z-50
                    flex flex-col bg-white
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-8px 0 40px rgba(30,58,95,0.18)' }}
      >
        {/* Header */}
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
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-xl leading-none transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >×</button>
        </div>

        {/* Items */}
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

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imagen_url}
                  alt={item.referencia_codigo}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }}
                  className="w-16 h-16 object-contain bg-slate-50 rounded-lg border border-slate-100 shrink-0"
                />

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
                    className="w-6 h-6 flex items-center justify-center rounded-lg
                               text-slate-300 hover:text-red-400 hover:bg-red-50
                               transition-colors text-lg leading-none"
                  >×</button>

                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQty(item.key, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-sm font-bold
                                 hover:bg-white transition-colors"
                      style={{ color: NAVY }}
                    >−</button>
                    <span className="text-sm font-bold w-5 text-center"
                          style={{ color: NAVY }}>{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(item.key, 1)}
                      disabled={item.cantidad >= item.stock_web}
                      title={item.cantidad >= item.stock_web ? `Máximo disponible: ${item.stock_web}` : undefined}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-sm font-bold
                                 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: NAVY }}
                    >+</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: solo si hay items */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 bg-white px-5 pt-4 pb-5 space-y-4 shrink-0">

            {/* ── Identificación cliente (OBLIGATORIO) ── */}
            <div className="rounded-xl border p-3 space-y-2"
                 style={{ borderColor: clienteListo ? '#10b981' : '#e2e8f0',
                          backgroundColor: clienteListo ? '#f0fdf4' : '#f8fafc' }}>

              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     style={{ color: clienteListo ? '#10b981' : '#94a3b8' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: clienteListo ? '#10b981' : '#64748b' }}>
                  {clienteListo ? 'Cliente identificado' : 'Identificación requerida'}
                </span>
              </div>

              {/* Cédula input */}
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
                  placeholder="Cédula de identidad"
                  maxLength={10}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none transition-all"
                  style={{
                    borderColor: clienteOk ? '#10b981' : esNuevo ? '#f97316' : '#e2e8f0',
                    backgroundColor: 'white',
                  }}
                />
                {buscando && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-orange-400 rounded-full animate-spin" />
                  </div>
                )}
                {clienteOk && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Cliente encontrado */}
              {clienteOk && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50
                                border border-emerald-200 rounded-lg px-3 py-2">
                  {clienteOk.nombre} {clienteOk.apellido ?? ''}
                  {clienteOk.telefono && (
                    <span className="text-emerald-500 font-normal ml-2">· {clienteOk.telefono}</span>
                  )}
                </div>
              )}

              {/* Cliente nuevo → pedir datos mínimos */}
              {esNuevo && !clienteOk && (
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-600 font-semibold">
                    Cédula nueva — completá tus datos:
                  </p>
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={e => setNuevoNombre(e.target.value)}
                    placeholder="Nombre y apellido *"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none"
                    style={{ backgroundColor: 'white' }}
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={nuevoTelefono}
                    onChange={e => setNuevoTelefono(e.target.value)}
                    placeholder="Teléfono / WhatsApp *"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none"
                    style={{ backgroundColor: 'white' }}
                  />
                </div>
              )}
            </div>

            {/* Aviso precio sin confirmar */}
            {items.some(i => !i.precio_web) && (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200
                             rounded-lg px-3 py-2 text-center">
                Precio a confirmar — el total exacto se calcula al finalizar
              </p>
            )}

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total pedido</span>
              <span className="text-xl font-extrabold" style={{ color: NAVY }}>
                {total > 0 ? `Gs. ${fmtGs(total)}` : '—'}
              </span>
            </div>

            {/* Error */}
            {errorMsg && (
              <p className="text-xs text-red-500 text-center">{errorMsg}</p>
            )}

            {/* Botón Finalizar — bloqueado hasta tener cliente */}
            <button
              onClick={handleFinalizar}
              disabled={!clienteListo || procesando}
              className="flex items-center justify-center gap-2 w-full
                         text-white font-bold py-3.5 rounded-xl transition-all"
              style={{
                backgroundColor: clienteListo ? ORANGE : '#cbd5e1',
                cursor: clienteListo ? 'pointer' : 'not-allowed',
              }}
              onMouseOver={e => { if (clienteListo) (e.currentTarget.style.backgroundColor = '#EA580C') }}
              onMouseOut={e => { if (clienteListo) (e.currentTarget.style.backgroundColor = ORANGE) }}
            >
              {procesando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  {!clienteListo && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  Finalizar pedido
                  {clienteListo && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </>
              )}
            </button>

            <button
              onClick={() => { clear(); resetCliente() }}
              className="w-full text-xs text-slate-400 hover:text-red-400 transition-colors py-1"
            >Vaciar pedido</button>
          </div>
        )}
      </div>
    </>
  )
}

export function CartButton() {
  const { count, setOpen } = useCart()

  return (
    <button
      onClick={() => setOpen(true)}
      className="relative flex items-center gap-2 px-3 py-2 rounded-xl
                 bg-white/10 hover:bg-white/20 text-white transition-colors"
      aria-label="Ver pedido"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <span className="hidden sm:inline text-sm font-medium">Pedido</span>
      {count > 0 && (
        <span className="flex items-center justify-center
                         text-white text-[10px] font-extrabold
                         min-w-[18px] h-[18px] px-1 rounded-full"
              style={{ backgroundColor: ORANGE }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
