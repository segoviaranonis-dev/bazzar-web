import { CartProvider } from '@/lib/cart/CartContext'
import { CartDrawer } from '@/lib/cart/CartDrawer'
import Header from './components/Header'
import CookieBanner from './components/CookieBanner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buildColorOptions } from '@/lib/colors'
import { getFiltros } from '@/lib/filtros'
import { Urbanist, Playfair_Display } from 'next/font/google'
import '../globals.css'

const urbanist = Urbanist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
})

// ── Categorización de marcas por género ──────────────────────────────────────
// Obtenido dinámicamente de la base de datos según el pilar Línea (Género)

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Obtener datos desde tablas maestras con FK (LEYES FUNDAMENTALES)
  const filtros = await getFiltros(supabase)

  // Obtener colores para sección hombres (no hay tabla maestra aún)
  const { data: coloresData } = await supabase
    .from('v_stock_web')
    .select('color_nombre')
    .gt('stock_web', 0)
    .not('color_nombre', 'is', null)

  const todosColores = Array.from(new Set(
    (coloresData ?? []).map(c => c.color_nombre).filter(Boolean)
  ))

  const headerData = {
    mujeres: {
      marcas:  filtros?.header.mujeres.marcas || [],
      estilos: filtros?.header.mujeres.estilos || [],
    },
    ninos: {
      marcas:  filtros?.header.ninos.marcas || [],
      estilos: filtros?.header.ninos.estilos || [],
    },
    hombres: {
      marcas:  filtros?.header.hombres.marcas || [],
      estilos: filtros?.header.hombres.estilos || [],
      colores: buildColorOptions(todosColores).map(o => o.base),
    },
  }

  return (
    <CartProvider>
      <div className={`min-h-screen bg-[#FAFAFA] ${urbanist.variable} ${playfair.variable} font-sans antialiased`}>

        <Header data={headerData} />

        <main className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">{children}</main>

        <CartDrawer />
        <CookieBanner />

        {/* Footer */}
        <footer className="mt-24 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

              <div className="col-span-2 md:col-span-1">
                <span className="font-serif text-2xl font-bold text-black block mb-3">bazzar</span>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
                  Calzado de moda femenino, masculino e infantil. Paraguay.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Mujeres</p>
                <ul className="space-y-2.5">
                  {headerData.mujeres.marcas.map(m => (
                    <li key={m}>
                      <Link href={`/catalogo?marca=${encodeURIComponent(m)}`}
                        className="text-xs text-gray-800 hover:text-black transition-colors capitalize">
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Hombres</p>
                <ul className="space-y-2.5 mb-6">
                  {headerData.hombres.marcas.map(m => (
                    <li key={m}>
                      <Link href={`/catalogo?marca=${encodeURIComponent(m)}`}
                        className="text-xs text-gray-800 hover:text-black transition-colors capitalize">
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Niños</p>
                <ul className="space-y-2.5">
                  {headerData.ninos.marcas.map(m => (
                    <li key={m}>
                      <Link href={`/catalogo?marca=${encodeURIComponent(m)}`}
                        className="text-xs text-gray-800 hover:text-black transition-colors capitalize">
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">Contacto</p>
                <ul className="space-y-2.5 text-xs text-gray-800">
                  <li>Asunción, Paraguay</li>
                  <li><a href="https://wa.me/595XXXXXXXXX" target="_blank" rel="noopener noreferrer"
                    className="hover:text-black transition-colors">WhatsApp</a></li>
                  <li><Link href="/nosotros" className="hover:text-black transition-colors">Nosotros</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-gray-400">© {new Date().getFullYear()} Bazzar Paraguay</p>
              <div className="flex gap-6 text-[11px] text-gray-400">
                <a href="#" className="hover:text-black transition-colors">Términos</a>
                <a href="#" className="hover:text-black transition-colors">Privacidad</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </CartProvider>
  )
}
