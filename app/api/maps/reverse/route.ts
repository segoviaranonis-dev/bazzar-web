import { NextResponse } from 'next/server'

/** Proxy Nominatim — reverse geocode (lat/lng → dirección). Paraguay first. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng inválidos' }, { status: 400 })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('accept-language', 'es')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('zoom', '18')

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BazzarWeb-Nexus/1.0 (delivery; localhost)',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoder no disponible' }, { status: 502 })
    }
    const data = (await res.json()) as {
      display_name?: string
      address?: Record<string, string>
    }
    const a = data.address ?? {}
    const partes = [
      a.road || a.pedestrian || a.path,
      a.house_number,
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.municipality,
      a.state,
    ].filter(Boolean)
    const direccion =
      partes.length >= 2 ? partes.join(', ') : data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`

    return NextResponse.json({
      ok: true,
      direccion,
      label: data.display_name ?? direccion,
      departamento: a.state ?? null,
      ciudad: a.city || a.town || a.village || a.municipality || null,
      distrito: a.suburb || a.neighbourhood || a.city_district || null,
      lat,
      lng,
    })
  } catch {
    return NextResponse.json({ error: 'Error de red geocoder' }, { status: 500 })
  }
}
