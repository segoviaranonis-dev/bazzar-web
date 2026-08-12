'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { PuntoEntrega, SugerenciaDireccion } from '@/lib/maps/types'
import { guardarPuntoEntrega, marcarGeoPermiso } from '@/lib/maps/entrega-cache'
import 'leaflet/dist/leaflet.css'

const ASU: [number, number] = [-25.28646, -57.647]
const NAVY = '#1E3A5F'
const ORANGE = '#F97316'

/** Pin SVG — sin PNG externos (CSP / webpack rompen marker-icon.png) */
const pinIcon = L.divIcon({
  className: 'bazzar-map-pin',
  html: `<div style="width:28px;height:28px;margin-left:-14px;margin-top:-28px;border-radius:50% 50% 50% 0;background:${ORANGE};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [0, 0],
})

type Props = {
  initial?: PuntoEntrega | null
  onConfirm: (p: PuntoEntrega) => void
  onClose: () => void
}

function MapReadyFix() {
  const map = useMap()
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80)
    const t2 = window.setTimeout(() => map.invalidateSize(), 400)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [map])
  return null
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.8 })
  }, [lat, lng, map])
  return null
}

function LongPressPin({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)

  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
    mousedown(e) {
      start.current = { x: e.containerPoint.x, y: e.containerPoint.y }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        onPick(e.latlng.lat, e.latlng.lng)
      }, 450)
    },
    mouseup() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    },
    mousemove(e) {
      if (!start.current || !timer.current) return
      const dx = Math.abs(e.containerPoint.x - start.current.x)
      const dy = Math.abs(e.containerPoint.y - start.current.y)
      if (dx + dy > 12) {
        clearTimeout(timer.current)
        timer.current = null
      }
    },
  })

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return null
}

export function MapaEntregaInner({ initial, onConfirm, onClose }: Props) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  )
  const [direccion, setDireccion] = useState(initial?.direccion ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [depto, setDepto] = useState<string | null>(initial?.departamento ?? null)
  const [ciudad, setCiudad] = useState<string | null>(initial?.ciudad ?? null)
  const [distrito, setDistrito] = useState<string | null>(initial?.distrito ?? null)
  const [q, setQ] = useState('')
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([])
  const [geoMsg, setGeoMsg] = useState<string | null>(null)
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [loadingRev, setLoadingRev] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function reverse(lat: number, lng: number) {
    setLoadingRev(true)
    try {
      const res = await fetch(`/api/maps/reverse?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      if (res.ok && data.direccion) {
        setDireccion(data.direccion)
        setLabel(data.label ?? data.direccion)
        setDepto(data.departamento ?? null)
        setCiudad(data.ciudad ?? null)
        setDistrito(data.distrito ?? null)
      } else {
        setDireccion(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    } catch {
      setDireccion(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setLoadingRev(false)
    }
  }

  function pick(lat: number, lng: number) {
    setPos({ lat, lng })
    void reverse(lat, lng)
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setGeoMsg('Tu navegador no soporta geolocalización.')
      return
    }
    setLoadingGeo(true)
    setGeoMsg('Pedimos permiso con calma — Delivery Bazzar usa este punto para coordinar tu envío.')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoadingGeo(false)
        marcarGeoPermiso('granted')
        setGeoMsg('Listo · tu ubicación quedó en este navegador para reconocerte la próxima vez.')
        pick(p.coords.latitude, p.coords.longitude)
      },
      (err) => {
        setLoadingGeo(false)
        if (err.code === err.PERMISSION_DENIED) {
          marcarGeoPermiso('denied')
          setGeoMsg('Permiso denegado. Activá ubicación en el navegador o marcá en el mapa con calma.')
        } else {
          setGeoMsg('No pudimos obtener tu ubicación. Marcá el punto en el mapa.')
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.trim().length < 3) {
      setSugerencias([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/maps/search?q=${encodeURIComponent(q.trim())}`)
        const data = await res.json()
        if (res.ok && Array.isArray(data.items)) setSugerencias(data.items)
      } catch {
        setSugerencias([])
      }
    }, 400)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [q])

  const center: [number, number] = pos ? [pos.lat, pos.lng] : ASU

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ backgroundColor: NAVY }}
      >
        <div>
          <p className="text-white font-bold text-sm">Mapa de entrega</p>
          <p className="text-white/70 text-[11px]">
            Mantené pulsado o tocá para marcar el punto · Delivery Bazzar
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-lg text-white/80 hover:bg-white/10 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="px-3 py-2 border-b border-slate-100 space-y-2 shrink-0 bg-slate-50">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar dirección (calle, barrio, ciudad)…"
            className="input w-full text-sm"
          />
          {sugerencias.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {sugerencias.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 border-b border-slate-50 last:border-0"
                    onClick={() => {
                      setQ(s.label)
                      setSugerencias([])
                      setDireccion(s.direccion)
                      setLabel(s.label)
                      setPos({ lat: s.lat, lng: s.lng })
                      setDepto(s.departamento ?? null)
                      setCiudad(s.ciudad ?? null)
                      setDistrito(s.distrito ?? null)
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          disabled={loadingGeo}
          onClick={usarMiUbicacion}
          className="btn-geo-agua w-full rounded-xl py-3 text-sm font-bold tracking-wide disabled:cursor-wait"
        >
          {loadingGeo ? 'Obteniendo ubicación con calma…' : 'Obtener permiso · usar mi ubicación'}
        </button>
        {geoMsg && <p className="text-[11px] text-teal-700/80">{geoMsg}</p>}
      </div>

      <div className="flex-1 min-h-0 relative">
        <MapContainer
          center={center}
          zoom={pos ? 16 : 13}
          className="h-full w-full z-0"
          style={{ height: '100%', width: '100%', minHeight: 280 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapReadyFix />
          <LongPressPin onPick={pick} />
          {pos && (
            <>
              <Marker position={[pos.lat, pos.lng]} icon={pinIcon} />
              <FlyTo lat={pos.lat} lng={pos.lng} />
            </>
          )}
        </MapContainer>
        <p className="absolute bottom-3 left-3 right-3 text-center text-[10px] font-medium bg-white/90 rounded-lg px-2 py-1.5 text-slate-600 pointer-events-none shadow">
          Tocá o mantené pulsado ~0,5 s para colocar el punto de referencia
        </p>
      </div>

      <div className="shrink-0 border-t border-slate-100 px-4 py-3 space-y-2 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Dirección detectada {loadingRev ? '· consultando mapa…' : ''}
        </p>
        <p className="text-sm font-semibold" style={{ color: NAVY }}>
          {direccion || 'Marcá un punto en el mapa'}
        </p>
        {(depto || ciudad || distrito) && (
          <p className="text-[11px] text-slate-500">
            {[depto, ciudad, distrito].filter(Boolean).join(' · ')}
            <span className="text-slate-300"> · catálogo D/C/D mañana</span>
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!pos || !direccion}
            onClick={() => {
              if (!pos || !direccion) return
              const p: PuntoEntrega = {
                lat: pos.lat,
                lng: pos.lng,
                direccion,
                label: label || direccion,
                departamento: depto,
                ciudad,
                distrito,
              }
              guardarPuntoEntrega(p)
              onConfirm(p)
            }}
            className="flex-[1.4] rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: ORANGE }}
          >
            Usar este punto
          </button>
        </div>
      </div>
    </div>
  )
}
