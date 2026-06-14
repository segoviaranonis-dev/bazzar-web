# Auditoría Bazzar Web

**Fecha:** 2026-06-10  
**Alcance:** código fuente, SQL, scripts, dependencias, build (`npm run build` OK)  
**Metodología:** revisión estática del repo; sin pruebas en producción ni pentest.

---

## Resumen ejecutivo

El build compila, pero hay **irregularidades críticas de seguridad** (credenciales en repo, exposición de datos de clientes/pedidos), **desalineación entre la vista SQL `v_stock_web` y el código TypeScript** (filtros, precios, columnas FK), y **flujos de checkout duplicados/incompletos**. El panel admin probablemente no permite login por un bug de layout.

| Severidad | Cantidad |
|-----------|----------|
| Crítica   | 6        |
| Alta      | 9        |
| Media     | 14       |
| Baja      | 8        |

---

## 1. Críticas

### 1.1 Credenciales de base de datos en el repositorio

Contraseña de Postgres/Supabase hardcodeada en texto plano:

| Archivo |
|---------|
| `scripts/debug_stock.mjs` |
| `scripts/check_images.mjs` |
| `ventas_por_mes_rimec-main/verificar_genero_v_stock_web.py` |
| `ventas_por_mes_rimec-main/query_estilos_dinamicos.py` |

**Riesgo:** acceso total a la BD si el repo se filtra o es público.  
**Acción:** rotar credenciales Supabase de inmediato, eliminar secretos del historial git, usar solo `.env.local` / CI secrets.

---

### 1.2 Exposición de datos de clientes por cédula (sin autenticación)

`buscarClientePorCedula` en `app/actions/checkout.ts` usa `createAdminClient()` (service_role, bypass RLS). Cualquier visitante puede invocarla desde checkout o CartDrawer con una cédula y obtener nombre, email, teléfono y dirección.

**Acción:** restringir a sesión autenticada, rate-limit agresivo, o consultar con anon key + RLS que solo devuelva datos del propio usuario.

---

### 1.3 Confirmación de pedido pública por ID (`/pedido/[id]`)

`app/(public)/pedido/[id]/page.tsx` usa `createAdminClient()` sin verificar que el visitante sea el dueño del pedido. Un atacante puede enumerar IDs y leer datos personales, ítems y totales.

**Acción:** token firmado en URL, sesión, o consulta con RLS; nunca service_role en rutas públicas.

---

### 1.4 Admin login bloqueado por el layout

`app/admin/layout.tsx` redirige a `/admin/login` si no hay usuario **para todas las rutas bajo `/admin`**, incluida `/admin/login`. Eso produce loop de redirección (`ERR_TOO_MANY_REDIRECTS`) y el panel queda inaccesible.

```tsx
// app/admin/layout.tsx — falta excluir /admin/login
if (!user) redirect('/admin/login')
```

**Acción:** route group `(dashboard)` con layout protegido; login fuera de ese layout, o `if (!user && pathname !== '/admin/login')`.

---

### 1.5 Service role en Server Actions invocables desde el cliente

`crearPedido` y `buscarClientePorCedula` bypassan RLS. Aunque la lógica valida inputs, un cliente malicioso puede abusar del endpoint (spam de pedidos, scraping masivo de cédulas).

**Acción:** CAPTCHA, rate limit por IP/cédula, auditoría de inserts; valorar RPC con permisos mínimos en lugar de service_role global.

---

### 1.6 Carpeta ajena con scripts de otro proyecto y secretos

`ventas_por_mes_rimec-main/` dentro de `bazzar-web` contiene scripts OT con connection string completa. No pertenece a este producto y amplifica la superficie de fuga.

**Acción:** eliminar del repo; mover scripts al monorepo correcto sin credenciales.

---

## 2. Altas

### 2.1 Vista `v_stock_web` desalineada con TypeScript

El SQL en repo (`supabase/v_stock_web.sql`) **no expone** columnas que el código asume:

| Código espera (`types/bazzar.ts`, `lib/filtros.ts`, catálogo) | Vista SQL actual |
|----------------------------------------------------------------|------------------|
| `linea_id`, `referencia_id` | ❌ ausentes |
| `genero_id`, `descp_genero` | ❌ ausentes |
| `grupo_estilo_id`, `descp_grupo_estilo` | `estilo_id`, `estilo` |
| `precio_web` con valor real | `NULL::numeric` fijo |

Consecuencias: filtros por marca/estilo vía `linea_id` fallan o quedan vacíos; agrupación del catálogo usa `undefined`; checkout resuelve por `referencia_codigo` + color + talla (frágil).

**Acción:** unificar vista con estándar migración 018 documentado en `types/bazzar.ts`; poblar `precio_web` desde lista/evento de precios.

---

### 2.2 Pedidos con total 0

`checkout.ts` acepta `precio_web null` y usa `precio ?? 0`. Con la vista actual todos los precios son NULL → pedidos registrados a **Gs. 0**.

---

### 2.3 Doble implementación de checkout

| Ruta | Estado |
|------|--------|
| `app/actions/checkout.ts` | Activa (checkout page + CartDrawer) |
| `app/api/checkout/route.ts` | Legacy; schema distinto (`DatosPedido` vs `DatosCheckout`); usa anon client |

Mantiene dos caminos con reglas distintas (validación cédula, campos cliente, rollback). Riesgo de regresión y confusión operativa.

**Acción:** eliminar o deprecar `app/api/checkout/route.ts`.

---

### 2.4 CartDrawer: checkout roto para clientes nuevos

`CartDrawer` envía `email: ''` y `direccion: ''` para clientes nuevos. El servidor exige email y dirección (`validarDatos`) → **siempre falla** salvo que el cliente ya exista en BD con datos completos.

La página `/checkout` sí pide todos los campos; hay **dos UX inconsistentes**.

---

### 2.5 Reserva de stock sin rollback transaccional

En `crearPedido`, si `reservar_stock` falla en el ítem N, los ítems 1…N-1 ya reservaron stock. Luego se hace `delete` del pedido pero **no se liberan** reservas previas → stock fantasma bloqueado.

El route legacy marca `RECHAZADO` en lugar de borrar; comportamiento distinto.

---

### 2.6 `ALM_WEB_01` hardcodeado

`app/actions/checkout.ts`: `const ALM_WEB_01 = 1`.  
`app/api/checkout/route.ts`: lookup dinámico `almacen.nombre = 'ALM_WEB_01'`.

Si el ID real ≠ 1 en otro entorno, checkout falla silenciosamente o escribe en almacén incorrecto.

---

### 2.7 Admin sin control de rol ni logout

- Cualquier usuario Supabase Auth autenticado accede al panel; no hay check de rol/admin.
- Nav apunta a `/admin/catalogo` y `/admin/stock` → **rutas inexistentes** (404).
- No hay `signOut`; sesión persiste indefinidamente.

---

### 2.8 Matching de color exacto en checkout

Checkout empareja ítems con `color_nombre === item.color_nombre` (string exacto). Los filtros del catálogo **normalizan** colores (`lib/colors.ts`). Un mismo producto puede no matchear y rechazar el pedido.

---

### 2.9 WhatsApp placeholder en producción

`595XXXXXXXXX` hardcodeado en:

- `app/(public)/layout.tsx`
- `app/(public)/pedido/[id]/page.tsx`
- `app/(public)/inicio/page.tsx`
- `app/(public)/nosotros/page.tsx`

`.env.example` define `ADMIN_WHATSAPP` pero **no se usa** en esas páginas (sí en `api/checkout/route.ts`).

---

## 3. Medias

### 3.1 Dependencias declaradas pero no usadas

En `package.json`, sin imports en el código:

- `resend` (+ vars en `.env.example`)
- `jspdf`
- `@mercadopago/sdk-react`

Checkout menciona MercadoPago/Bancard en UI; no hay integración.

---

### 3.2 Middleware copiado de otro producto

`middleware.ts` comentario: *"Middleware de seguridad para rimec-web"*. Rate limit in-memory con `setInterval` no escala en serverless (Vercel): cada instancia tiene su propio Map; limpieza puede fallar en edge.

---

### 3.3 Security headers duplicados

CSP/HSTS/X-Frame-Options definidos en **`middleware.ts`** y **`next.config.mjs`**. Valores distintos (p. ej. CSP `img-src` más permisivo en middleware: `https:` vs host Supabase fijo).

---

### 3.4 Búsqueda rota en catálogo

- Header y `FiltrosCatalogo` navegan a `/catalogo?q=...`
- `catalogo/page.tsx` **no lee** `searchParams.q`
- `FiltrosCatalogo` tiene estado `ofertas` sin uso; UI de selector de colores incompleta (estado `colorOpen`/`toggleColor` sin dropdown visible)

---

### 3.5 Tipografía inconsistente

- `app/layout.tsx`: Inter + Playfair
- `app/(public)/layout.tsx`: Urbanist + Playfair (redefine `--font-sans`)

Anidación de layouts produce fuentes distintas según ruta.

---

### 3.6 UI: botón carrito invisible en header

`CartButton` usa `text-white` y `bg-white/10` sobre header blanco → bajo contraste / casi invisible.

---

### 3.7 Cookie banner decorativo

Menciona analítica de tráfico pero **no hay analytics** integrado. Botón "Configurar" solo guarda flag en localStorage sin opciones reales. Enlaces Términos/Privacidad → `href="#"`.

---

### 3.8 Documentación eliminada del repo

Git status muestra borrados: `README.md`, `AGENTS.md`, `CONTEXT.md`, docs de deploy y arquitectura Nexus. Onboarding y deploy quedan sin referencia en el repo.

---

### 3.9 Supabase host hardcodeado en config

`next.config.mjs`: `SUPABASE_HOST = 'extrlcvcgypwazxipvqm.supabase.co'`. Debería derivarse de env para staging/prod alternativos.

---

### 3.10 `id_color_f9` mal mapeado en catálogo

`ProductoCard` / agrupación usan `color_id` de BD como `id_color_f9`. Las imágenes usan `color_code` / `id_color_f9` según `product-image.ts` → posibles URLs de imagen incorrectas.

---

### 3.11 Subqueries correlacionadas en vista SQL

`v_stock_web` usa subqueries a `pedido_proveedor_detalle` por fila para `id_material_f9` / `id_color_f9`. Impacto de performance en catálogos grandes.

---

### 3.12 Validación de cédula inconsistente

| Capa | Regla |
|------|-------|
| Checkout Zod | max 10 caracteres |
| Servidor `CEDULA_RE` | 5–15 dígitos |
| CartDrawer input | maxLength 10, solo dígitos |

---

### 3.13 Scripts de debug en repo de producción

`scripts/debug_stock.mjs` y `check_images.mjs` son herramientas locales con credenciales; no deberían versionarse.

---

### 3.14 `ventas_por_mes_rimec-main` mezcla dominios

Scripts OT de verificación de género/estilos referencian columnas (`genero`, `estilo`) que no coinciden con los nombres que usa el frontend (`descp_genero`, `descp_grupo_estilo`).

---

## 4. Bajas

### 4.1 Sin archivo ESLint propio

Build usa defaults de `eslint-config-next`; no hay reglas de proyecto ni CI explícito de lint.

---

### 4.2 Sin tests automatizados

No hay unit/e2e tests para checkout, filtros ni reserva de stock.

---

### 4.3 CSP permisiva

`unsafe-inline` y `unsafe-eval` en script-src (común en Next 14, pero reduce protección XSS).

---

### 4.4 `normalizeColor` con falsos positivos

Usa `.includes(key)` → p. ej. un color que contenga substring "ROSA" dentro de otro nombre puede clasificarse mal.

---

### 4.5 Rate limit solo en `/api/*`

Server Actions (`crearPedido`, `buscarClientePorCedula`) no pasan por rate limit del middleware.

---

### 4.6 Bloqueo de user-agents de herramientas de seguridad

Middleware bloquea Burp, ZAP, etc. Dificulta auditorías legítimas; no sustituye controles reales.

---

### 4.7 `revalidate = 60` en catálogo vs `0` en admin

Coherente, pero stock puede mostrarse stale hasta 60 s tras una venta web concurrente.

---

### 4.8 Tipos legacy sin uso activo

`CombinacionCatalogo`, `ItemCarrito`, `DatosPedido` en `types/bazzar.ts` — posible deuda; API checkout aún usa subset.

---

## 5. Matriz de archivos revisados

| Área | Archivos clave |
|------|----------------|
| Checkout | `app/actions/checkout.ts`, `app/api/checkout/route.ts`, `checkout/page.tsx`, `CartDrawer.tsx` |
| Catálogo | `catalogo/page.tsx`, `FiltrosCatalogo.tsx`, `ProductoCard.tsx`, `lib/filtros.ts` |
| Admin | `admin/layout.tsx`, `admin/login/page.tsx`, `admin/page.tsx` |
| Supabase | `v_stock_web.sql`, `migrations_bazzar.sql`, `lib/supabase/*` |
| Seguridad | `middleware.ts`, `next.config.mjs` |
| Scripts | `scripts/*.mjs`, `ventas_por_mes_rimec-main/*.py` |

---

## 6. Prioridad de remediación sugerida

1. **Rotar credenciales** y purgar secretos del repo (1.1, 1.6, 3.13).
2. **Corregir admin login** (1.4) y **cerrar fugas de datos** (1.2, 1.3, 1.5).
3. **Alinear `v_stock_web`** con tipos + precios reales (2.1, 2.2).
4. **Unificar checkout**; arreglar CartDrawer y rollback de stock (2.3–2.5).
5. **Eliminar código muerto** y placeholders (2.9, 3.1, 3.4).
6. Documentación mínima (`README`, deploy, variables env).

---

## 7. Evidencia de build

```
npm run build → ✓ Compiled successfully (Next.js 14.2.29)
Rutas: /, /catalogo, /checkout, /pedido/[id], /admin, /admin/login, /api/checkout, /api/search
```

El build exitoso **no implica** que login admin, filtros FK ni checkout desde drawer funcionen en runtime.

---

*Generado por auditoría estática — Bazzar Web.*
