/** Páginas con margen (catálogo, checkout, etc.). Inicio queda fuera a sangre. */
export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8 lg:px-12">
      {children}
    </div>
  )
}
