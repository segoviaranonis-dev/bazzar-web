/** @type {import('next').NextConfig} */

const SUPABASE_HOST = 'extrlcvcgypwazxipvqm.supabase.co'

const securityHeaders = [
  // Evita que la página se cargue dentro de un iframe (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Bloquea sniffing de tipo MIME
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No enviar referrer a otros dominios
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Fuerza HTTPS por 1 año
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Deshabilita funciones de browser innecesarias
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `img-src 'self' https://${SUPABASE_HOST} data: blob:`,
      `connect-src 'self' https://${SUPABASE_HOST}`,
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      // Next.js necesita inline scripts para hydration
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
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
