# bazzar-web — Contexto del Proyecto
> Leer antes de modificar cualquier archivo. Máx 150 líneas.

## Qué es
E-commerce Bazzar (www.bazzar.com.py). Sucursal web = ALM_WEB_01 en Supabase.
Demo para el director. Un solo proveedor en fase inicial.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Deploy: Vercel → www.bazzar.com.py

## Estructura
```
app/(public)/catalogo/   → catálogo público (Server Component, revalidate 60s)
app/admin/               → panel admin (auth requerida)
app/admin/login/         → login con Supabase Auth
app/api/checkout/        → POST: reservar stock + crear pedido
lib/supabase/client.ts   → cliente browser
lib/supabase/server.ts   → cliente server (SSR cookies)
middleware.ts            → protege /admin/* → /admin/login si no hay sesión
types/bazzar.ts          → tipos del dominio
```

## Fuente de datos (Supabase)
- `v_catalogo_web`        → catálogo con precio WEB vigente + stock
- `v_stock_actual`        → stock por combinación + almacén
- `reservar_stock()`      → función atómica first-click-wins
- `pedido_web`            → pedidos web
- `pedido_web_detalle`    → líneas del pedido
- Almacén web: `ALM_WEB_01` (tipo TIENDA)
- Lista de precios: `MINORISTA_WEB` (tipo WEB, PYG)

## Reglas de negocio
- Stock: NUNCA UPDATE directo — siempre via `reservar_stock()`
- Precios: leer de `v_catalogo_web.precio_web`
- Imagen: `imagen_bucket + '/' + imagen_formula.replace({pilares})`
- Carrito: localStorage (no requiere login de cliente)
- Checkout: POST /api/checkout → HTTP 409 si sin stock

## Flujo de pago (FASE 1 — simulación)
1. Cliente confirma → /api/checkout → `reservar_stock()`
2. Si ok → pedido_web PENDIENTE → retorna wa_link
3. Frontend muestra botón WhatsApp al admin
4. Admin ve en /admin → confirma manualmente

## Variables de entorno (.env.local — NUNCA en repo)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
ADMIN_EMAIL
ADMIN_WHATSAPP
```

## Pendiente (próximas fases)
- Página producto individual + galería
- Carrito client-side con localStorage
- Página checkout con formulario
- RLS en Supabase (OBLIGATORIO antes de FASE 5)
- Emails con Resend (FASE 3)
- Bancard API (post-demo)
