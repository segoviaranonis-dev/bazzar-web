import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bazzar — Tienda Online',
  description: 'Tu tienda de calzado y accesorios favorita en Paraguay',
  openGraph: {
    title: 'Bazzar — Tienda Online',
    description: 'Tu tienda de calzado y accesorios favorita en Paraguay',
    siteName: 'Bazzar',
    locale: 'es_PY',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
