'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CartButton } from '@/lib/cart/CartDrawer'
import { CatalogoSearchField } from '@/components/CatalogoSearchField'
import {
  GENERO_NAV,
  HEADER_NAV_ITEMS,
  isHeaderNavActive,
} from '@/lib/nav/header-nav'
import { prefetchMegaNavBackground } from '@/lib/nav/mega-nav-cache'
import MegaMenuRebajas from './MegaMenuRebajas'
import MegaMenuGenero from './MegaMenuGenero'

export interface HeaderData {
  showAuditoriaLocal?: boolean
}

type MegaKey = 'rebajas' | 'caballeros' | 'damas' | 'ninas' | 'ninos' | null

const GENERO_MEGA: Record<
  Exclude<MegaKey, 'rebajas' | null>,
  { id: number; label: string }
> = {
  caballeros: GENERO_NAV.caballeros,
  damas: GENERO_NAV.damas,
  ninas: GENERO_NAV.ninas,
  ninos: GENERO_NAV.ninos,
}

const GENERO_MEGA_IDS = new Set(['caballeros', 'damas', 'ninas', 'ninos'])

export default function Header({ data }: { data: HeaderData }) {
  const [mega, setMega] = useState<MegaKey>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    prefetchMegaNavBackground()
  }, [])

  const openMega = (key: MegaKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMega(key)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMega(null), 160)
  }

  const generoActivo =
    mega && GENERO_MEGA_IDS.has(mega)
      ? GENERO_MEGA[mega as keyof typeof GENERO_MEGA]
      : null

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/95 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-[1440px] items-center gap-3 overflow-visible px-4 md:px-8 lg:px-12">
          <Link
            href="/inicio"
            prefetch
            className="relative z-10 shrink-0 font-serif text-[1.35rem] font-medium tracking-[0.06em] text-neutral-950"
            aria-label="Inicio · portada"
          >
            bazzar
          </Link>

          <Suspense fallback={<nav className="absolute left-1/2 hidden -translate-x-1/2 md:block" />}>
            <HeaderNavCenter
              showAuditoriaLocal={data.showAuditoriaLocal}
              mega={mega}
              onMegaEnter={openMega}
              onMegaLeave={scheduleClose}
            />
          </Suspense>

          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Suspense fallback={null}>
              <HeaderNavMobile />
            </Suspense>
            <Suspense fallback={null}>
              <CatalogoSearchField variant="header" />
            </Suspense>
            <CartButton />
          </div>
        </div>

        <div
          onMouseEnter={() => {
            if (mega) openMega(mega)
          }}
          onMouseLeave={scheduleClose}
        >
          <MegaMenuRebajas
            open={mega === 'rebajas'}
            onClose={() => setMega(null)}
          />
          {generoActivo ? (
            <MegaMenuGenero
              key={generoActivo.id}
              open
              onClose={() => setMega(null)}
              generoId={generoActivo.id}
              label={generoActivo.label}
            />
          ) : null}
        </div>
      </header>
      <div className="h-16 shrink-0" aria-hidden />
    </>
  )
}

function HeaderNavCenter({
  showAuditoriaLocal,
  mega,
  onMegaEnter,
  onMegaLeave,
}: {
  showAuditoriaLocal?: boolean
  mega: MegaKey
  onMegaEnter: (k: MegaKey) => void
  onMegaLeave: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const enAuditoria = pathname?.startsWith('/auditoria-local')

  return (
    <nav
      className="absolute left-1/2 top-1/2 hidden w-[min(920px,calc(100vw-11rem))] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 overflow-visible lg:gap-x-5 md:flex"
      aria-label="Navegación"
    >
      {HEADER_NAV_ITEMS.map((item) => {
        const isMega =
          item.id === 'rebajas' || GENERO_MEGA_IDS.has(item.id)
        const active = isMega
          ? mega === item.id || isHeaderNavActive(item, pathname, searchParams)
          : isHeaderNavActive(item, pathname, searchParams)

        if (isMega) {
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch
              onMouseEnter={() => onMegaEnter(item.id as MegaKey)}
              onMouseLeave={onMegaLeave}
              onFocus={() => onMegaEnter(item.id as MegaKey)}
              className={`relative shrink-0 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors sm:text-[12px] ${
                active
                  ? 'bg-neutral-100 px-2 text-neutral-950'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              {item.label}
            </Link>
          )
        }

        return (
          <NavLink key={item.id} href={item.href} active={active} prefetch>
            {item.label}
          </NavLink>
        )
      })}
      {showAuditoriaLocal ? (
        <NavLink href="/auditoria-local" active={!!enAuditoria} title="Solo local · no deploy">
          Estadísticas
        </NavLink>
      ) : null}
    </nav>
  )
}

function HeaderNavMobile() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const items = HEADER_NAV_ITEMS.filter((i) =>
    ['rebajas', 'caballeros', 'damas', 'catalogo'].includes(i.id),
  )

  return (
    <nav
      className="flex max-w-[42vw] flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5 overflow-visible md:hidden"
      aria-label="Navegación móvil"
    >
      {items.map((item) => (
        <NavLink
          key={item.id}
          href={item.href}
          active={isHeaderNavActive(item, pathname, searchParams)}
          prefetch
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function NavLink({
  href,
  active,
  children,
  title,
  prefetch = true,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
  title?: string
  prefetch?: boolean
}) {
  return (
    <Link
      href={href}
      title={title}
      prefetch={prefetch}
      className={`relative shrink-0 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors sm:text-[12px] ${
        active
          ? 'text-neutral-950 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-neutral-950'
          : 'text-neutral-600 hover:text-neutral-950'
      }`}
    >
      {children}
    </Link>
  )
}
