'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart/CartContext'
import { ProductImage } from '@/components/ProductImage'
import { MapaEntregaModal } from '@/components/entrega/MapaEntregaModal'
import type { PuntoEntrega } from '@/lib/maps/types'
import {
  guardarEntregaCache,
  guardarPuntoEntrega,
  leerEntregaCache,
} from '@/lib/maps/entrega-cache'
import { crearPedido, buscarClientePorCedula } from '@/app/actions/checkout'

/* ── Validación ── */
const schema = z.object({
  cedula:    z.string().min(5, 'Ingresá tu cédula (mín. 5 dígitos)').max(10),
  nombre:    z.string().min(2, 'Ingresá tu nombre'),
  apellido:  z.string().optional(),
  email:     z.string().email('Email inválido'),
  telefono:  z.string().min(7, 'Teléfono inválido'),
  direccion: z.string().min(5, 'Ingresá tu dirección'),
  notas:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

/* ── helpers ── */
const fmtGs = (n: number) => new Intl.NumberFormat('es-PY').format(n)

/* ── Línea · referencia (NO usar prop `ref` — reservada React) ── */
function RefTag({ linea, referencia }: { linea: string; referencia: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold">
      <span style={{ color: '#1E3A5F' }}>{linea}</span>
      <span className="text-slate-300">·</span>
      <span style={{ color: '#F97316' }}>{referencia}</span>
    </span>
  )
}

export default function CheckoutPage() {
  const { items, total, count, hydrated, clear } = useCart()
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [cedulaBuscando, setCedulaBuscando] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [mapaOpen, setMapaOpen] = useState(false)
  const [punto, setPunto] = useState<PuntoEntrega | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const cedula = watch('cedula')
  const direccionWatch = watch('direccion')
  const nombreWatch = watch('nombre')
  const telefonoWatch = watch('telefono')

  /* ── Memoria navegador: último punto + datos Delivery ── */
  useEffect(() => {
    if (!hydrated) return
    const cache = leerEntregaCache()
    if (!cache) return
    if (cache.punto && !punto) {
      setPunto(cache.punto)
      if (cache.punto.direccion) {
        setValue('direccion', cache.punto.direccion, { shouldValidate: true })
      }
    }
    if (cache.cedula && !cedula) setValue('cedula', cache.cedula)
    if (cache.nombre && !nombreWatch) setValue('nombre', cache.nombre)
    if (cache.telefono && !telefonoWatch) setValue('telefono', cache.telefono)
    if (cache.direccion_texto && !direccionWatch && !cache.punto) {
      setValue('direccion', cache.direccion_texto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al hidratar
  }, [hydrated])

  /* ── Autocomplete por cédula ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setClienteEncontrado(false)

    if (!cedula || cedula.replace(/\D/g, '').length < 6) return

    debounceRef.current = setTimeout(async () => {
      setCedulaBuscando(true)
      try {
        const digits = cedula.replace(/\D/g, '')
        const cliente = await buscarClientePorCedula(digits)
        if (cliente) {
          setValue('nombre',   cliente.nombre)
          setValue('apellido', cliente.apellido ?? '')
          setClienteEncontrado(true)
          guardarEntregaCache({
            cedula: digits,
            nombre: cliente.nombre,
          })
        } else {
          guardarEntregaCache({ cedula: digits })
        }
      } finally {
        setCedulaBuscando(false)
      }
    }, 600)
  }, [cedula, setValue])

  async function onSubmit(datos: FormData) {
    setServerError(null)
    startTransition(async () => {
      const resultado = await crearPedido(
        {
          ...datos,
          entrega_lat: punto?.lat ?? null,
          entrega_lng: punto?.lng ?? null,
          entrega_label: punto?.label ?? null,
          departamento: punto?.departamento ?? null,
          ciudad: punto?.ciudad ?? null,
          distrito: punto?.distrito ?? null,
        },
        items,
      )
      if (resultado.ok && resultado.pedido_id && resultado.token_acceso) {
        if (punto) guardarPuntoEntrega(punto, { cedula: datos.cedula.replace(/\D/g, '') })
        guardarEntregaCache({
          cedula: datos.cedula.replace(/\D/g, ''),
          nombre: datos.nombre,
          telefono: datos.telefono,
          direccion_texto: datos.direccion,
          punto: punto ?? leerEntregaCache()?.punto ?? null,
        })
        clear()
        // Confirmar pedido → pedido + auto-inicio pasarela Bancard (PCI redirect)
        router.push(
          `/pedido/${resultado.pedido_id}?t=${encodeURIComponent(resultado.token_acceso)}&pago=auto`,
        )
      } else {
        setServerError(resultado.error ?? 'Error desconocido')
      }
    })
  }

  /* ── Esperar hidratación (evita «vacío» falso al navegar desde el drawer) ── */
  if (!hydrated) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <p className="text-sm text-slate-400">Cargando pedido…</p>
      </div>
    )
  }

  /* ── Carrito vacío ── */
  if (count === 0) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="font-bold text-lg" style={{ color: '#1E3A5F' }}>Tu pedido está vacío</p>
        <p className="text-slate-400 text-sm mt-1">Agregá productos desde el catálogo</p>
        <a href="/catalogo"
          className="inline-block mt-5 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          style={{ backgroundColor: '#F97316' }}>
          Ver catálogo
        </a>
      </div>
    )
  }

  const enviando = isSubmitting || isPending

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#1E3A5F' }}>
          Confirmar pedido
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Completá tus datos · entrega a domicilio (EDB se dispara solo)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        <form onSubmit={handleSubmit(onSubmit)} className="order-2 lg:order-1 lg:col-span-3 space-y-5">

          {/* ─ CÉDULA + AUTOCOMPLETE ─ */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4"
               style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: '#1E3A5F' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
              </div>
              <h2 className="font-bold text-base" style={{ color: '#1E3A5F' }}>
                Identificación
              </h2>
            </div>

            {/* Cédula */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Cédula de identidad *
              </label>
              <div className="relative">
                <input
                  {...register('cedula')}
                  className="input pr-10"
                  placeholder="Ej: 4.567.890"
                  onInput={e => {
                    // Solo números y puntos
                    const val = e.currentTarget.value.replace(/[^0-9.]/g, '')
                    e.currentTarget.value = val
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cedulaBuscando && (
                    <svg className="w-4 h-4 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {clienteEncontrado && !cedulaBuscando && (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              {errors.cedula && <p className="text-red-500 text-xs mt-1">{errors.cedula.message}</p>}
              {clienteEncontrado && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <span>✓</span> Cliente registrado — datos completados automáticamente
                </p>
              )}
            </div>
          </div>

          {/* ─ DATOS PERSONALES ─ */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4"
               style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: '#F97316' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="font-bold text-base" style={{ color: '#1E3A5F' }}>
                Datos personales
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre *" error={errors.nombre?.message}>
                <input {...register('nombre')} className="input" placeholder="María" />
              </Field>
              <Field label="Apellido" error={errors.apellido?.message}>
                <input {...register('apellido')} className="input" placeholder="García" />
              </Field>
            </div>

            <Field label="Email *" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input" placeholder="tu@email.com" />
            </Field>

            <Field label="Teléfono / WhatsApp *" error={errors.telefono?.message}>
              <input {...register('telefono')} className="input" placeholder="+595 9XX XXX XXX" />
            </Field>
          </div>

          {/* ─ ENTREGA ─ */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4"
               style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-sky-500">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="font-bold text-base" style={{ color: '#1E3A5F' }}>Entrega</h2>
            </div>

            <Field label="Dirección *" error={errors.direccion?.message}>
              <input {...register('direccion')} className="input" placeholder="Calle, número, barrio, ciudad" />
            </Field>

            <button
              type="button"
              onClick={() => setMapaOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-sky-50 py-3 text-sm font-bold text-sky-800 hover:bg-sky-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Abrir mapa · marcar punto de referencia
            </button>
            {punto ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                <p className="font-bold">Punto en mapa listo</p>
                <p className="mt-0.5 truncate">{punto.label || punto.direccion}</p>
                <p className="text-green-600 mt-0.5 font-mono">
                  {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Delivery Bazzar coordina desde este mapa. El navegador recuerda tu punto y datos
                en este dispositivo para reconocerte la próxima vez.
              </p>
            )}

            <Field label="Notas para la entrega" error={errors.notas?.message}>
              <textarea {...register('notas')} className="input resize-none" rows={2}
                placeholder="Horario preferido, referencias..." />
            </Field>
          </div>

          <MapaEntregaModal
            open={mapaOpen}
            initial={
              punto ??
              (direccionWatch
                ? {
                    lat: -25.28646,
                    lng: -57.647,
                    direccion: direccionWatch,
                    label: direccionWatch,
                  }
                : null)
            }
            onClose={() => setMapaOpen(false)}
            onConfirm={(p) => {
              setPunto(p)
              setValue('direccion', p.direccion, { shouldValidate: true })
              setMapaOpen(false)
            }}
          />

          {/* ─ PAGO ─ */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5"
               style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-orange-700">Coordinamos al confirmar</p>
                <p className="text-xs text-orange-500">Efectivo · Transferencia · MercadoPago · Bancard</p>
              </div>
            </div>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={enviando}
            className="w-full flex items-center justify-center gap-2
                       text-white font-bold py-4 rounded-xl transition-colors text-base"
            style={{ backgroundColor: enviando ? '#9ca3af' : '#F97316' }}>
            {enviando ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Registrando pedido...
              </>
            ) : (
              <>
                Confirmar pedido · Gs. {fmtGs(total)}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* ── Resumen del pedido (primero en móvil) ── */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 lg:sticky lg:top-20"
               style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
            <h2 className="font-bold text-base mb-4" style={{ color: '#1E3A5F' }}>
              Resumen <span className="text-slate-400 font-normal text-sm">({count} {count === 1 ? 'par' : 'pares'})</span>
            </h2>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map(item => (
                <div key={item.key} className="flex gap-3 items-start">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
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
                      alt={item.referencia_codigo}
                      variant="thumb"
                      className="h-full w-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <RefTag linea={item.linea_codigo} referencia={item.referencia_codigo} />
                    <p className="text-xs font-semibold truncate mt-0.5" style={{ color: '#1E3A5F' }}>
                      {item.referencia_descripcion || item.referencia_codigo}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.color_nombre} · T.{item.talla_codigo} · ×{item.cantidad}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.precio_web ? (
                      <p className="text-xs font-bold text-orange-500">
                        Gs. {fmtGs(item.precio_web * item.cantidad)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400">Consultar</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 mt-4 pt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span>Gs. {fmtGs(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Envío</span>
                <span className="text-green-600 font-semibold">A coordinar</span>
              </div>
              <div className="flex justify-between font-extrabold text-base pt-2 border-t border-slate-100">
                <span style={{ color: '#1E3A5F' }}>Total</span>
                <span style={{ color: '#F97316' }}>Gs. {fmtGs(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
