# ETAPA BAZZAR-WEB-001 — Producción + Bancard

**Inicio:** 2026-06-10  
**Director:** Héctor  
**Producto:** bazzar-web (Next.js 14 · Supabase · Vercel)  
**Dominio objetivo:** [www.bazzar.com.py](https://www.bazzar.com.py)

---

## Objetivo de la etapa

1. Corregir irregularidades de seguridad detectadas en auditoría (`docs/AUDITORIA_BAZZAR_WEB.md`).
2. Preparar despliegue estable en **www.bazzar.com.py**.
3. Iniciar trámite de **pasarela Bancard** (empresa paraguaya) para pagos en línea.
4. Unificar checkout y alinear catálogo con vista `v_stock_web` P0.

**Estado:** EN CURSO (trabajo local — commit/deploy al **Cerrar Etapa**).

---

## Entregables técnicos (esta sesión)

| Ítem | Archivo / acción |
|------|------------------|
| Token de acceso en confirmación de pedido | `supabase/migrations_etapa_001.sql`, `app/actions/checkout.ts` |
| Admin login sin loop | `app/admin/(auth)/`, `app/admin/(dashboard)/` |
| Rate-limit server actions | `lib/security/rate-limit.ts` |
| Sin credenciales en repo | scripts con `DATABASE_URL`; eliminado `ventas_por_mes_rimec-main/` |
| Checkout único | eliminado `app/api/checkout/route.ts`; drawer → `/checkout` |
| Vista SQL P0 | `supabase/v_stock_web.sql` alineado migración 056 |
| WhatsApp desde env | `lib/whatsapp.ts` |
| Stub integración Bancard | `lib/payments/bancard.ts`, `docs/BANCARD_SOLICITUD.md` |
| Deploy Vercel | `docs/DEPLOY_VERCEL_BAZZAR.md` |

---

## SQL pendiente en Supabase (ejecutar manualmente)

Antes de producción, correr en **SQL Editor**:

1. `supabase/v_stock_web.sql` — vista catálogo P0.
2. `supabase/migrations_etapa_001.sql` — token pedido + `liberar_stock_reserva`.
3. `supabase/migrations_bazzar.sql` — si columnas cliente/pedido faltan.

---

## Bancard — próximos pasos comerciales

Ver checklist completo: **`docs/BANCARD_SOLICITUD.md`**

Resumen:

1. Contacto comercial Bancard Paraguay → alta comercio e-commerce.
2. Documentación empresa (RUC, representante legal, cuenta bancaria).
3. URLs producción: `https://www.bazzar.com.py`, webhook `https://www.bazzar.com.py/api/payments/bancard/callback`.
4. Credenciales sandbox → integración `VPOS` / API REST según manual Bancard.
5. Certificación sandbox → producción.

**Integración código:** fase siguiente de etapa (post-credenciales). Stub en `lib/payments/bancard.ts`.

---

## Deploy www.bazzar.com.py

Ver **`docs/DEPLOY_VERCEL_BAZZAR.md`**

Variables obligatorias en Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_WHATSAPP=595981XXXXXX
ADMIN_EMAIL=
BAZZAR_ADMIN_EMAILS=admin@bazzar.com.py
# Bancard (cuando lleguen)
BANCARD_PUBLIC_KEY=
BANCARD_PRIVATE_KEY=
BANCARD_COMMERCE_CODE=
BANCARD_ENV=sandbox
```

---

## Criterios de cierre de etapa

- [ ] SQL ejecutado en Supabase producción.
- [ ] Build verde (`npm run build`).
- [ ] Smoke: catálogo → carrito → checkout → confirmación con token.
- [ ] Admin login funcional.
- [ ] Dominio www.bazzar.com.py apuntando a Vercel (DNS verificado).
- [ ] Solicitud Bancard enviada (comprobante en `docs/BANCARD_SOLICITUD.md`).
- [ ] Commit consolidado + merge + deploy (protocolo **Cerrar Etapa**).

---

## Decisiones

- **Token pedido:** UUID en `pedido_web.token_acceso`; URL `/pedido/[id]?t=...` — no service_role en rutas públicas.
- **Autocomplete cédula:** solo nombre/apellido; email/teléfono se completan en checkout (reduce fuga PII).
- **CartDrawer:** redirige a `/checkout` (formulario completo validado).
- **Precio web:** vista aún NULL en SQL; checkout rechaza pedido si `precio_servidor <= 0` (evita pedidos a Gs. 0).

---

*Etapa iniciada por autorización del Director — 2026-06-10.*
