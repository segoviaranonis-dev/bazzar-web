import { CartProvider } from '@/lib/cart/CartContext'
import { CartDrawer } from '@/lib/cart/CartDrawer'
import Header from './components/Header'
import CookieBanner from './components/CookieBanner'
import Link from 'next/link'
import { isAuditoriaLocalEnabled } from '@/lib/auditoria-local/enabled'
import { adminWhatsAppUrl } from '@/lib/whatsapp'
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

/** Layout público — cabecera ops siamese (sin mega-menú moda). */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const headerData = {
    showAuditoriaLocal: isAuditoriaLocalEnabled(),
  }

  return (
    <CartProvider>
      <div
        className={`min-h-screen overflow-x-hidden bg-[#F7F6F4] ${urbanist.variable} ${playfair.variable} font-sans antialiased`}
      >
        <Header data={headerData} />

        <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8 lg:px-12">
          {children}
        </main>

        <CartDrawer />
        <CookieBanner />

        <footer className="mt-16 border-t border-slate-200">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8 lg:px-12">
            <div>
              <Link href="/inicio" className="font-serif text-xl font-bold text-slate-900">
                bazzar
              </Link>
              <p className="mt-1 text-xs text-slate-400">
                Catálogo tienda web · ALM_WEB · Paraguay
              </p>
            </div>
            <ul className="flex flex-wrap gap-4 text-xs text-slate-600">
              <li>
                <Link href="/catalogo" className="hover:text-slate-900">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="hover:text-slate-900">
                  Nosotros
                </Link>
              </li>
              <li>
                <a
                  href={adminWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} Bazzar Paraguay
            </p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
