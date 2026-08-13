/** Catálogo a sangre: sidebar al margen izquierdo (rompe max-w de tienda). */
export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-[100vw] -mt-6 md:-mt-8">
      {children}
    </div>
  )
}
