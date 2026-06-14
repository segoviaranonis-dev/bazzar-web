import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, pruneRateLimitStore } from '@/lib/security/rate-limit'

const RATE_LIMIT = { windowMs: 10_000, maxRequests: 30 }

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') ?? 'unknown'
}

function checkApiRateLimit(key: string): boolean {
  pruneRateLimitStore()
  const result = checkRateLimit(`api:${key}`, RATE_LIMIT.maxRequests, RATE_LIMIT.windowMs)
  return result.ok
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    if (!checkApiRateLimit(getRateLimitKey(req))) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '10', 'Content-Type': 'text/plain' },
      })
    }
  }

  const userAgent = req.headers.get('user-agent') ?? ''
  if (/sqlmap|nikto|masscan/i.test(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const blockedPaths = ['/.env', '/.git', '/wp-admin', '/wp-login', '/phpmyadmin']
  if (blockedPaths.some(p => pathname.includes(p))) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
