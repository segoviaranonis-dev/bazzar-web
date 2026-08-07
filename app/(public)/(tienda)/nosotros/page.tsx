import Link from 'next/link'
import { adminWhatsAppUrl } from '@/lib/whatsapp'

export const metadata = {
  title: 'Nosotros — Bazzar Paraguay',
  description: 'Conocé nuestra misión, visión y valores. Bazzar Paraguay, calzado femenino de calidad con excelencia en servicio y atención al cliente.',
}

const VALORES = [
  { icon: '✦', title: 'Calidad Premium',  desc: 'Trabajamos exclusivamente con marcas líderes que garantizan materiales, confort y durabilidad en cada par.' },
  { icon: '❤', title: 'Atención Genuina', desc: 'Cada cliente merece una experiencia única. Asesoramos personalmente para encontrar el calzado perfecto.' },
  { icon: '🚀', title: 'Entrega Confiable', desc: 'Envíos seguros a todo Paraguay. Trabajamos con operadoras de confianza para que tu pedido llegue intacto.' },
  { icon: '◈', title: 'Transparencia',     desc: 'Stock real, precios claros y comunicación honesta. Sin sorpresas, con toda la información que necesitás.' },
]

const MARCAS_FOOTER = ['VIZZANO', 'MOLECA', 'MOLEKINHA', 'MOLEKINHO', 'MODARE', 'ACTVITTA']

export default function NosotrosPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="text-center pt-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-3"
           style={{ color: '#F97316' }}>
          Quiénes somos
        </p>
        <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ color: '#1E3A5F' }}>
          Bazzar Paraguay
        </h1>
        <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: '#475569' }}>
          Somos una empresa paraguaya especializada en calzado femenino de calidad.
          Unimos las mejores marcas brasileñas con la calidez del servicio local,
          llevando moda y confort a cada rincón del país.
        </p>
      </section>

      {/* ── Misión & Visión ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Misión */}
        <div className="rounded-2xl p-8 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #1E3A5F, #0F2340)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
               style={{ background: '#F97316', filter: 'blur(30px)' }} />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                 style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
              🎯
            </div>
            <h2 className="text-xl font-black mb-3" style={{ color: '#F97316' }}>
              Misión
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Acercar calzado de calidad premium a cada mujer paraguaya, brindando una
              experiencia de compra cómoda, transparente y personalizada. Somos el puente
              entre las mejores marcas y quienes las buscan, con excelencia en cada
              interacción.
            </p>
          </div>
        </div>

        {/* Visión */}
        <div className="rounded-2xl p-8 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #2C1810, #4A2C1A)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
               style={{ background: '#D4AF37', filter: 'blur(30px)' }} />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                 style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
              🌟
            </div>
            <h2 className="text-xl font-black mb-3" style={{ color: '#D4AF37' }}>
              Visión
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ser la tienda de calzado de referencia en Paraguay, reconocida por la
              calidad de nuestros productos, la calidez de nuestra atención y la
              confianza que construimos con cada cliente. Aspiramos a crecer junto
              a las familias paraguayas, comprendiendo sus necesidades.
            </p>
          </div>
        </div>

      </section>

      {/* ── Política de la Empresa ────────────────────────────────────── */}
      <section>
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
             style={{ color: '#F97316' }}>Nuestro Compromiso</p>
          <h2 className="text-2xl md:text-3xl font-black" style={{ color: '#1E3A5F' }}>
            Política de la Empresa
          </h2>
        </div>

        <div className="rounded-2xl p-8 border"
             style={{ borderColor: '#E2E8F0', background: 'white' }}>
          <p className="text-base leading-relaxed mb-6" style={{ color: '#475569' }}>
            En Bazzar Paraguay nos comprometemos a ofrecer la más alta calidad en
            productos y servicios, guiados por principios de integridad, respeto
            y mejora continua. Nuestra política se sustenta en:
          </p>
          <ul className="space-y-4">
            {[
              { t: 'Excelencia en el servicio', d: 'Cada contacto con el cliente es una oportunidad para superar expectativas. Capacitamos a nuestro equipo para brindar asesoramiento experto y soluciones rápidas.' },
              { t: 'Atención personalizada', d: 'Escuchamos activamente las necesidades de cada cliente para ofrecer recomendaciones genuinas, sin presiones, con el único objetivo de encontrar el calzado ideal.' },
              { t: 'Garantía de producto', d: 'Comercializamos únicamente marcas reconocidas con estándares de manufactura verificados. Ante cualquier defecto, actuamos de inmediato para resolver la situación.' },
              { t: 'Mejora continua', d: 'Incorporamos el feedback de nuestros clientes como motor de mejora. Revisamos procesos, actualizamos nuestro catálogo y adoptamos nuevas tecnologías para servir mejor.' },
              { t: 'Responsabilidad comercial', d: 'Operamos con transparencia financiera y ética empresarial, cumpliendo todas las normativas vigentes y construyendo relaciones de largo plazo con proveedores y clientes.' },
            ].map(({ t, d }) => (
              <li key={t} className="flex gap-4">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                     style={{ background: '#FFF7ED', border: '1.5px solid #F97316' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#1E3A5F' }}>{t}</p>
                  <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Valores ───────────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
             style={{ color: '#F97316' }}>Lo que nos define</p>
          <h2 className="text-2xl md:text-3xl font-black" style={{ color: '#1E3A5F' }}>
            Nuestros Valores
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VALORES.map((v) => (
            <div key={v.title} className="rounded-2xl p-6 border transition-all hover:shadow-md"
                 style={{ borderColor: '#E2E8F0', background: 'white' }}>
              <div className="text-2xl mb-3">{v.icon}</div>
              <h3 className="font-black text-base mb-2" style={{ color: '#1E3A5F' }}>
                {v.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marcas que trabajamos ─────────────────────────────────────── */}
      <section className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-2"
           style={{ color: '#F97316' }}>Portfolio</p>
        <h2 className="text-2xl font-black mb-6" style={{ color: '#1E3A5F' }}>
          Las marcas que elegimos
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {MARCAS_FOOTER.map((m) => (
            <Link key={m} href={`/catalogo?marca=${m}`}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider
                             transition-all hover:scale-105 border"
                  style={{ borderColor: '#CBD5E1', color: '#1E3A5F', background: 'white' }}>
              {m}
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl p-8 text-center"
             style={{ background: 'linear-gradient(135deg, #1E3A5F, #0F2340)' }}>
          <h3 className="text-2xl font-black mb-2" style={{ color: 'white' }}>
            ¿Querés conocernos más?
          </h3>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Escribinos y con gusto te contamos todo sobre nuestros productos y servicios.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={adminWhatsAppUrl()} target="_blank" rel="noopener noreferrer"
               className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
               style={{ background: '#25D366', color: 'white' }}>
              💬 Escribinos por WhatsApp
            </a>
            <Link href="/catalogo"
                  className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>
              Ver Catálogo →
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
