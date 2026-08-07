import Link from 'next/link'
import HeroSlider from './HeroSlider'
import ImagenPortada from '@/components/ImagenPortada'
import { adminWhatsAppUrl } from '@/lib/whatsapp'

const MARCAS = [
  {
    nombre: 'VIZZANO',
    desc:   'Elegancia italiana',
    bg:     'linear-gradient(135deg, #0A0A0A, #2D2400)',
    accent: '#D4AF37',
    icon:   '✦',
    href:   '/catalogo?marca=VIZZANO',
  },
  {
    nombre: 'MOLECA',
    desc:   'Moda y actitud',
    bg:     'linear-gradient(135deg, #3D0024, #B5396B)',
    accent: '#FFE040',
    icon:   '🌸',
    href:   '/catalogo?marca=MOLECA',
  },
  {
    nombre: 'MOLEKINHA',
    desc:   'Mini fashionista',
    bg:     'linear-gradient(135deg, #4A0030, #D4608A)',
    accent: '#FFB3C6',
    icon:   '💗',
    href:   '/catalogo?marca=MOLEKINHA',
  },
  {
    nombre: 'MOLEKINHO',
    desc:   'Aventura sin límites',
    bg:     'linear-gradient(135deg, #001A3D, #1A6BC4)',
    accent: '#7EC8E3',
    icon:   '🌊',
    href:   '/catalogo?marca=MOLEKINHO',
  },
  {
    nombre: 'MODARE',
    desc:   'Sofisticación atemporal',
    bg:     'linear-gradient(135deg, #2C2219, #7A6050)',
    accent: '#D4B896',
    icon:   '◈',
    href:   '/catalogo?marca=MODARE',
  },
  {
    nombre: 'ACTVITTA',
    desc:   'Movimiento activo',
    bg:     'linear-gradient(135deg, #001829, #005C8A)',
    accent: '#4FC3F7',
    icon:   '⚡',
    href:   '/catalogo?marca=ACTVITTA',
  },
]

const DESCUENTOS = [
  {
    label:   'HASTA 30% OFF',
    desc:    'Vizzano temporada anterior',
    tag:     'Liquidación',
    href:    '/catalogo?marca=VIZZANO',
    bg:      'linear-gradient(135deg, #1A0F00, #3D2800)',
    accent:  '#F97316',
  },
  {
    label:   'NUEVOS INGRESOS',
    desc:    'Moleca colección primavera',
    tag:     'Recién llegado',
    href:    '/catalogo?marca=MOLECA',
    bg:      'linear-gradient(135deg, #1A0010, #3D0024)',
    accent:  '#EC4899',
  },
  {
    label:   '2 × 1',
    desc:    'Molekinha & Molekinho seleccionados',
    tag:     'Promo especial',
    href:    '/catalogo',
    bg:      'linear-gradient(135deg, #00101A, #00264D)',
    accent:  '#3B82F6',
  },
]

export default function InicioPage() {
  return (
    <div className="space-y-16">

      {/* ── Hero Slider ──────────────────────────────────────────────── */}
      <section>
        <HeroSlider />
      </section>

      {/* ── Marcas ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1"
               style={{ color: '#F97316' }}>Nuestras Marcas</p>
            <h2 className="text-2xl md:text-3xl font-black" style={{ color: '#1E3A5F' }}>
              Un mundo de estilo
            </h2>
          </div>
          <Link href="/catalogo"
                className="text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: '#F97316' }}>
            Ver todo →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MARCAS.map((m) => (
            <Link key={m.nombre} href={m.href}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300
                             hover:scale-105 hover:shadow-xl"
                  style={{ background: m.bg, minHeight: 140 }}>

              <ImagenPortada
                marca={m.nombre}
                tier="md"
                fit="cover"
                className="absolute inset-0"
                alt={`Portada ${m.nombre}`}
              />
              <div className="absolute inset-0"
                   style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)' }} />

              <div className="relative z-10 p-4 flex flex-col h-full justify-end" style={{ minHeight: 140 }}>
                <div>
                  <p className="text-xs font-black tracking-widest uppercase leading-tight text-white">
                    {m.nombre}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {m.desc}
                  </p>
                </div>
              </div>

              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                   style={{ color: m.accent, fontSize: 14, fontWeight: 700 }}>→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Descuentos / Promos ───────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1"
               style={{ color: '#F97316' }}>Ofertas</p>
            <h2 className="text-2xl md:text-3xl font-black" style={{ color: '#1E3A5F' }}>
              Descuentos y Promociones
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DESCUENTOS.map((d) => (
            <Link key={d.label} href={d.href}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300
                             hover:scale-[1.02] hover:shadow-xl"
                  style={{ background: d.bg, minHeight: 160 }}>

              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
                     style={{ background: d.accent, filter: 'blur(40px)' }} />
              </div>

              <div className="relative z-10 p-6 flex flex-col h-full justify-between" style={{ minHeight: 160 }}>
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                      style={{ background: `${d.accent}25`, color: d.accent, border: `1px solid ${d.accent}40` }}>
                  {d.tag}
                </span>
                <div>
                  <p className="text-2xl font-black leading-tight" style={{ color: d.accent }}>
                    {d.label}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {d.desc}
                  </p>
                  <p className="text-xs font-semibold mt-3 group-hover:underline"
                     style={{ color: d.accent }}>
                    Ver productos →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA WhatsApp ─────────────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl overflow-hidden relative"
             style={{ background: 'linear-gradient(135deg, #1E3A5F, #0F2340)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 right-0 w-80 h-80 rounded-full opacity-10"
                 style={{ background: '#F97316', filter: 'blur(80px)' }} />
          </div>
          <div className="relative z-10 px-8 py-12 flex flex-col md:flex-row items-center
                          justify-between gap-6 text-center md:text-left">
            <div>
              <h3 className="text-2xl font-black mb-2" style={{ color: 'white' }}>
                ¿Necesitás asesoramiento?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)' }} className="text-sm max-w-md">
                Escribinos por WhatsApp y te ayudamos a encontrar el calzado perfecto.
                Envíos a todo Paraguay.
              </p>
            </div>
            <a href={adminWhatsAppUrl()}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm
                          transition-all hover:scale-105 active:scale-95 shrink-0"
               style={{ background: '#25D366', color: 'white' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12.004 2.003A9.997 9.997 0 002 12.001c0 1.762.46 3.418 1.265 4.86L2 22l5.293-1.239A9.96 9.96 0 0012.004 22c5.523 0 9.997-4.477 9.997-10.001 0-5.521-4.474-9.996-9.997-9.996zm0 18.175a8.157 8.157 0 01-4.162-1.138l-.298-.177-3.084.722.757-2.994-.195-.308A8.178 8.178 0 013.826 12c0-4.512 3.665-8.18 8.178-8.18 4.515 0 8.179 3.668 8.179 8.18 0 4.513-3.664 8.178-8.179 8.178z"/>
              </svg>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
