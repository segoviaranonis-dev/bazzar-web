# NEXUS — Objetivo Actual
> Sprint activo. Fecha: 2026-03-31. Reescribir cuando cambie el sprint.

## Sprint: Bazzar.com.py — Lanzamiento Sucursal Digital (Demo Director)

**Alcance real:** Demo funcional para el director de la empresa en www.bazzar.com.py
Un solo proveedor. Stock cargado desde CSV maestro. Pago simulado vía
WhatsApp/email (Bancard se integra cuando llegue la aprobación del servicio).
**No es para el público general todavía.**

---

## Decisiones Arquitecturales (cerradas)

| Decisión | Resolución |
|---|---|
| Frontend público | Next.js — catálogo + checkout |
| Panel admin | Next.js `/admin` ruta protegida — dueño exclusivo de ALM_WEB_01 |
| BD | Supabase — fuente única de verdad para ambos frentes |
| ERP Streamlit | Solo lectura de ALM_WEB_01 — reportería, no escritura |
| Pagos fase 1 | Simulación: botón genera mensaje WhatsApp + email al admin |
| Pagos fase 2 | Bancard API (cuando llegue aprobación del servicio) |
| Concurrencia | Función atómica PostgreSQL — first-click-wins, aviso al segundo |
| Sucursal web ID | `ALM_WEB_01` — almacén tipo TIENDA en la BD |
| Dominio | www.bazzar.com.py — ya registrado y disponible |
| Datos iniciales | CSV maestro de 1 proveedor con los 5 pilares |
| Repositorios | `segoviaranonis-dev` — cuenta GitHub protegida, privada |

---

## Plan de Acción hasta el Despliegue

### FASE 0 — Fundamentos (Supabase) [COMPLETA ✅]
- ✅ 17 tablas e-commerce creadas en Supabase
- ✅ Función atómica `reservar_stock()` — first-click-wins
- ✅ Vistas `v_stock_actual`, `v_catalogo_web`, `v_ventas_pivot`
- ✅ Datos iniciales: `ALM_WEB_01` + `MINORISTA_WEB`
- ⬜ Importar CSV maestro → catálogos + combinaciones + stock + precios

### FASE 1 — Next.js Base [COMPLETA ✅]
- ✅ Repo `bazzar-web` privado en `segoviaranonis-dev`
- ✅ Next.js 14+ App Router + TypeScript + Tailwind + Supabase SSR
- ✅ `middleware.ts` — protege `/admin/*`
- ✅ Catálogo público desde `v_catalogo_web`
- ✅ Panel admin + login Supabase Auth
- ✅ API checkout con `reservar_stock()`
- ✅ Dev server en `http://localhost:3000`
- ⬜ Configurar dominio en Vercel (FASE 5)

### FASE 2 — Catálogo Público · ~3 días
- ⬜ Ficha de producto individual con galería
- ⬜ Filtros: color, talla, precio
- ⬜ SEO + Open Graph
- ⬜ Diseño responsive mobile-first

### FASE 3 — Checkout Simulado · ~2 días
- ⬜ Carrito localStorage (sin login)
- ⬜ Formulario checkout
- ⬜ Flujo: confirmar → reservar_stock() → pedido_web
- ⬜ Pantalla confirmación + botón WhatsApp admin

### FASE 4 — Panel Admin `/admin` · ~3 días
- ⬜ Pedidos en tiempo real (Supabase Realtime)
- ⬜ Confirmar/rechazar pedidos
- ⬜ Gestión catálogo y stock

### FASE 5 — Deploy y Demo · ~1 día
- ⬜ Deploy Vercel → www.bazzar.com.py
- ⬜ **RLS Supabase activado** ← OBLIGATORIO
- ⬜ Smoke test completo
- ⬜ Demo para el director

### FASE 6 — Post-demo (Bancard)
- ⬜ Bancard Checkout API
- ⬜ Webhook confirmación automática
- ⬜ Apertura al público

---

## Reglas de Rigor de Base de Datos (PERMANENTES)

Estas reglas NO son opcionales. Sin excepciones.

- `movimiento_detalle` APPEND-ONLY — **Nunca UPDATE ni DELETE**
- `precio` APPEND-ONLY — **Nunca UPDATE**
- Stock siempre via `reservar_stock()` — nunca SQL directo
- Combinaciones inmutables — se desactivan, nunca se borran
- RLS obligatorio antes de FASE 5
- Credenciales solo en `.env.local` — nunca en código ni commits
- `.mcp.json` y `.env` siempre en `.gitignore`

---

## MCPs Activos

| MCP | Estado |
|---|---|
| `supabase` | ✅ Activo |
| `github` | ✅ Activo |
| `resend` | ⬜ Pendiente |
| `vercel` | ⬜ Pendiente (FASE 5) |
