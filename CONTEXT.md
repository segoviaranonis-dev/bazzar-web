# bazzar-web — Contexto
> Leer antes de tocar cualquier archivo.

## Qué es
E-commerce Bazzar (www.bazzar.com.py). Sucursal web del sistema NEXUS RIMEC.
Demo activa para el director. Un proveedor inicial.

## Stack
Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Vercel

## Reglas de BD — INAMOVIBLES
- **Stock:** NUNCA UPDATE directo. Solo vía `reservar_stock()` (RPC atómica, first-click-wins)
- **Precios:** Leer de `v_stock_web.precio_web` — la tabla `precio` es APPEND-ONLY
- **Movimientos:** APPEND-ONLY. Para anular: INSERT con signo opuesto
- **combinacion_id:** Siempre requerido en `pedido_web_detalle` (NEXUS lo usa para JOIN)
- Almacén web: `ALM_WEB_01` (id = 1)

## Estado actual (FASE 5 en progreso)
- ✅ Catálogo público `/catalogo` con filtros (marca, estilo, color)
- ✅ Carrito localStorage con cap de stock por talla
- ✅ Checkout con validación de precio server-side + `reservar_stock()`
- ✅ `combinacion_id` propagado desde `v_stock_web` → `Talla` → `CartItem` → detalle
- ✅ Panel admin `/admin` (lista pedidos)
- ✅ Middleware auth — protege `/admin/*`
- ✅ RLS Supabase — `anon` bloqueado, `service_role` bypassa, `v_stock_web` pública
- ✅ Deploy Vercel producción → https://bazzar-web.vercel.app
- ⬜ Emails con Resend
- ⬜ Bancard API (post-aprobación)
- ⬜ Dominio `www.bazzar.com.py` (post-aprobación demo)

## Archivos clave
```
app/(public)/catalogo/page.tsx        → Server Component, lee v_stock_web, arma ProductoAgrupado
app/(public)/catalogo/ProductoCard.tsx → Client, Talla tiene combinacion_id + stock
app/(public)/checkout/page.tsx        → Client, formulario checkout con react-hook-form + zod
app/(public)/pedido/[id]/page.tsx     → Server, confirmación post-pedido
app/actions/checkout.ts               → Server Action: resuelve combinacion_id, valida precio BD,
                                        llama reservar_stock(), inserta pedido_web_detalle
app/admin/page.tsx                    → Lista pedidos
app/api/checkout/route.ts             → Ruta legacy (mantener, no usar en nuevo código)
lib/cart/CartContext.tsx              → CartItem incluye combinacion_id + stock_web
lib/cart/CartDrawer.tsx               → Drawer con cap visual de stock (botón + deshabilitado)
lib/supabase/server.ts                → createClient() con cookies SSR
middleware.ts                         → Protege /admin/*
types/bazzar.ts                       → StockWebItem, CartItem, PedidoWeb, etc.
supabase/v_stock_web.sql              → Vista: stock + precio por combinacion+talla
```

## Variables de entorno (.env.local — nunca al repo)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
ADMIN_WHATSAPP
NEXT_PUBLIC_SITE_URL
```

## Flujo de pedido
```
Cliente → carrito (localStorage) → CartDrawer / checkout page
  → crearPedido() [server action]
      1. Consulta v_stock_web filtrado por referencia_codigo (NO select *)
      2. Resuelve combinacion_id y precio desde BD (descarta precio del cliente)
      3. Upsert cliente_web
      4. INSERT pedido_web (estado=PENDIENTE)
      5. reservar_stock() por cada item → si falla: DELETE pedido + error
      6. INSERT pedido_web_detalle con combinacion_id real
  → NEXUS "Pedidos Web" lee pedido_web JOIN pedido_web_detalle JOIN combinacion
  → Admin confirma en NEXUS → descuenta stock ALM_WEB_01
```
