# BAZZAR WEB — Roadmap
> Stack: Next.js 14 · Supabase · Tailwind · Vercel · Bancard

## Fuente de stock
`v_stock_web` — movimientos ALM_WEB_01 tipo INGRESO_COMPRA, estado CONFIRMADO.
Cada fila = `combinacion_id` único (linea + referencia + material + color + talla) + precio_web.

---

## FASE 1 — Base ✅ COMPLETA
- [x] Catálogo Server Component con `revalidate: 60`
- [x] Middleware auth `/admin/*`
- [x] Panel admin básico (lista pedidos)

## FASE 2 — Catálogo + Carrito + Checkout ✅ COMPLETA
- [x] Filtros: marca, estilo, color (URL params, SSR-friendly)
- [x] `combinacion_id` propagado: `v_stock_web → Talla → CartItem → pedido_web_detalle`
- [x] Carrito localStorage con cap de stock por talla
- [x] `crearPedido` server action: precio validado en BD + `reservar_stock()` atómica
- [x] Cliente nuevo/existente con autocomplete por cédula
- [x] Página confirmación `/pedido/[id]`

## FASE 3 — Imágenes y Producto ⬜
- Galería producto: swipe mobile (Embla Carousel), zoom desktop
- Next/Image con Vercel Image Optimization + WebP/AVIF
- Fallback placeholder SVG por marca
- SEO: metadata dinámica (Open Graph para WhatsApp preview)

## FASE 4 — Pagos Bancard ⬜
```
reservar_stock() → Bancard Single Buy API → iframe Bancard
← webhook /api/bancard/confirm → confirmar pedido_web
```
Variables: `BANCARD_PUBLIC_KEY`, `BANCARD_PRIVATE_KEY`, `BANCARD_ENV=staging|production`
Staging: `https://vpos.infonet.com.py:8888`
Timeout: si webhook no llega en 15 min → liberar reserva (Supabase pg_cron)

## FASE 5 — Producción 🔄
- [x] RLS Supabase — `anon` bloqueado, `service_role` bypassa
- [x] Deploy Vercel → https://bazzar-web.vercel.app (demo director)
- [ ] Rate limiting en `/api/checkout` (Upstash Redis o Vercel middleware)
- [ ] Emails transaccionales con Resend: confirmación cliente + alerta admin
- [ ] Dominio `www.bazzar.com.py` (post-aprobación demo)
- [ ] Monitoreo: Vercel Analytics + Sentry

---

## Variables de entorno completas
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BANCARD_PUBLIC_KEY=
BANCARD_PRIVATE_KEY=
BANCARD_ENV=staging
RESEND_API_KEY=
ADMIN_EMAIL=
ADMIN_WHATSAPP=
NEXT_PUBLIC_SITE_URL=https://www.bazzar.com.py
```
