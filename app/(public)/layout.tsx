import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/catalogo" className="text-2xl font-bold text-amber-600">Bazzar</Link>
            <Link href="/carrito" className="p-2 text-gray-600 hover:text-amber-600 transition-colors" aria-label="Carrito">
              <span className="text-xl">🛒</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <footer className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} Bazzar — Paraguay
        </div>
      </footer>
    </div>
  )
}
