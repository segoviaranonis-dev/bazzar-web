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
      `img-src 'self' https://${SUPABASE_HOST} https://*.tile.openstreetmap.org https://tile.openstreetmap.org data: blob:`,
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
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
