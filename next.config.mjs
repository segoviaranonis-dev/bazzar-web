/** @type {import('next').NextConfig} */

function supabaseHost() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  try {
    return new URL(raw).hostname
  } catch {
    return 'localhost'
  }
}

const SUPABASE_HOST = supabaseHost()

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // geolocation=(self) — mapa entrega checkout (CHUSAR 2.5.1.28)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // OSM tiles mapa entrega + data: pin SVG
      `img-src 'self' https://${SUPABASE_HOST} https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://vpos.infonet.com.py data: blob:`,
      // VPOS Bancard (iframe Single Buy) + Supabase
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://vpos.infonet.com.py https://vpos.infonet.com.py:8888`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://vpos.infonet.com.py https://vpos.infonet.com.py:8888",
      "frame-ancestors 'none'",
      // Script + iframe checkout Bancard (PCI hospedado)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vpos.infonet.com.py https://vpos.infonet.com.py:8888",
      "style-src 'self' 'unsafe-inline'",
      "frame-src 'self' https://vpos.infonet.com.py https://vpos.infonet.com.py:8888",
      "child-src 'self' https://vpos.infonet.com.py https://vpos.infonet.com.py:8888",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: SUPABASE_HOST,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
