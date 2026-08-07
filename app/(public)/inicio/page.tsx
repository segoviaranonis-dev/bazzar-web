import Link from 'next/link'
import HeroSlider from './HeroSlider'
import ImagenPortada from '@/components/ImagenPortada'
import { adminWhatsAppUrl } from '@/lib/whatsapp'

const MARCAS = [
  { nombre: 'VIZZANO', desc: 'Elegancia italiana', href: '/catalogo?marca=VIZZANO' },
  { nombre: 'MOLECA', desc: 'Moda y actitud', href: '/catalogo?marca=MOLECA' },
  { nombre: 'MOLEKINHA', desc: 'Mini fashionista', href: '/catalogo?marca=MOLEKINHA' },
  { nombre: 'MOLEKINHO', desc: 'Aventura sin límites', href: '/catalogo?marca=MOLEKINHO' },
  { nombre: 'MODARE', desc: 'Sofisticación atemporal', href: '/catalogo?marca=MODARE' },
  { nombre: 'ACTVITTA', desc: 'Movimiento activo', href: '/catalogo?marca=ACTVITTA' },
]

const OFERTAS = [
  {
    label: 'Hasta 30% OFF',
    desc: 'Vizzano · temporada anterior',
    href: '/catalogo?marca=VIZZANO',
    marca: 'VIZZANO',
  },
  {
    label: 'Nuevos ingresos',
    desc: 'Moleca · colección viva',
    href: '/catalogo?marca=MOLECA',
    marca: 'MOLECA',
  },
  {
    label: '2 × 1',
    desc: 'Molekinha & Molekinho',
    href: '/catalogo',
    marca: 'MOLEKINHA',
  },
]

export default function InicioPage() {
  return (
    <div>
      {/* Hero: 100% del viewport · pegado al header · sin cajita */}
      <HeroSlider />

      <div className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12">
        <section className="mt-12 md:mt-14">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
            <div>
              <h2 className="font-serif text-3xl font-medium tracking-tight text-neutral-950 md:text-4xl">
                Marcas
              </h2>
              <p className="mt-1 text-sm text-neutral-500">Elegí tu universo</p>
            </div>
            <Link
              href="/catalogo"
              className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-800 underline-offset-4 hover:underline"
            >
              Ver todo
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {MARCAS.map((m) => (
              <Link
                key={m.nombre}
                href={m.href}
                className="group relative block overflow-hidden bg-neutral-200"
                style={{ aspectRatio: '4 / 5' }}
              >
                <ImagenPortada
                  marca={m.nombre}
                  tier="md"
                  fit="cover"
                  className="absolute inset-0 h-full w-full transition duration-700 ease-out group-hover:scale-[1.04]"
                  alt={`Portada ${m.nombre}`}
                />
                <div
                  className="absolute inset-0 z-[1]"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.72) 100%)',
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
                  <p className="font-serif text-lg font-medium tracking-wide text-white md:text-xl">
                    {m.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-white/70">{m.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 md:mt-20">
          <div className="mb-8 border-b border-neutral-200 pb-4">
            <h2 className="font-serif text-3xl font-medium tracking-tight text-neutral-950 md:text-4xl">
              Ahora
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Ofertas y novedades</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {OFERTAS.map((o) => (
              <Link
                key={o.label}
                href={o.href}
                className="group relative block min-h-[220px] overflow-hidden bg-neutral-900 md:min-h-[280px]"
              >
                <ImagenPortada
                  marca={o.marca}
                  tier="md"
                  fit="cover"
                  className="absolute inset-0 h-full w-full opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-95"
                  alt=""
                />
                <div
                  className="absolute inset-0 z-[1]"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 100%)',
                  }}
                />
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-6">
                  <p className="font-serif text-2xl font-medium text-white md:text-3xl">
                    {o.label}
                  </p>
                  <p className="mt-1 text-sm text-white/70">{o.desc}</p>
                  <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                    Ver →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-neutral-200 py-14 md:mt-20 md:py-16">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h3 className="font-serif text-2xl font-medium text-neutral-950 md:text-3xl">
                ¿Buscás asesoramiento?
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
                Escribinos por WhatsApp. Te ayudamos a elegir. Envíos a todo Paraguay.
              </p>
            </div>
            <a
              href={adminWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-neutral-900 bg-neutral-950 px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800"
            >
              WhatsApp
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
