import { NextResponse } from 'next/server'

/** Proxy Nominatim — sugerencias de dirección (viewbox Paraguay). */
export async function GET(request: Request) {
  const q = String(new URL(request.url).searchParams.get('q') ?? '').trim()
  if (q.length < 3) {
    return NextResponse.json({ ok: true, items: [] })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('q', q)
    url.searchParams.set('countrycodes', 'py')
    url.searchParams.set('accept-language', 'es')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '6')
    // viewbox aprox Paraguay
    url.searchParams.set('viewbox', '-62.7,-19.3,-54.2,-27.6')
    url.searchParams.set('bounded', '0')

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BazzarWeb-Nexus/1.0 (delivery; localhost)',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Búsqueda no disponible' }, { status: 502 })
    }
    const rows = (await res.json()) as Array<{
      place_id: number
      display_name: string
      lat: string
      lon: string
      address?: Record<string, string>
    }>

    const items = rows.map((r) => {
      const a = r.address ?? {}
      const partes = [
        a.road || a.pedestrian,
        a.house_number,
        a.suburb || a.neighbourhood,
        a.city || a.town || a.village,
      ].filter(Boolean)
      return {
        id: String(r.place_id),
        label: r.display_name,
        direccion: partes.length ? partes.join(', ') : r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon),
        departamento: a.state ?? null,
        ciudad: a.city || a.town || a.village || null,
        distrito: a.suburb || a.neighbourhood || null,
      }
    })

    return NextResponse.json({ ok: true, items })
  } catch {
    return NextResponse.json({ error: 'Error de red búsqueda' }, { status: 500 })
  }
}
