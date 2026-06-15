# ETAPA BAZZAR-WEB-002 — Lanzamiento oficial y cierre de proyecto

**Estado:** Absorbida por **[ETAPA_ABIERTA_PUBLICACION.md](./ETAPA_ABIERTA_PUBLICACION.md)** (2026-06-10)  
**Objetivo histórico:** Lanzamiento en **www.bazzar.com.py** con auditoría de cierre.  
**Repo:** https://github.com/segoviaranonis-dev/bazzar-web.git  
**Predecesora:** [ETAPA_BAZZAR-WEB-001](ETAPA_BAZZAR_WEB_001.md)

---

## Veredicto ejecutivo (auditoría 2026-06-10)

| Área | Estado | Listo producción |
|------|--------|------------------|
| **Build** | ✅ `npm run build` OK | Sí |
| **Seguridad código** | ✅ Etapa 001 aplicada | Sí*, ver SQL pendiente |
| **Secretos en git** | ✅ Sin passwords hardcodeados | Sí* rotación DB hecha por Director |
| **NIIF visual** | ⚠️ Ajustes menores aplicados | Sí (marca Bazzar + reglas admin) |
| **Bancard (pagos)** | 🔴 Stub — sin credenciales comerciales | **No** — corredor manual hasta alta Bancard |
| **Deploy dominio** | ⏳ Pendiente Cerrar Etapa | Director + Vercel DNS |

\* Requiere SQL `migrations_etapa_001.sql` + `v_stock_web.sql` ejecutados en Supabase producción.

---

## 1. Seguridad — checklist de cierre

### ✅ Implementado

| Control | Evidencia |
|---------|-----------|
| Sin credenciales en repo | Solo placeholders en `.env.example` |
| Token acceso pedido | `pedido_web.token_acceso` + URL `?t=` |
| Rate-limit checkout / cédula | `lib/security/rate-limit.ts` |
| Autocomplete cédula limitado | Solo nombre/apellido |
| Admin sin loop login | `app/admin/(auth)/` + `(dashboard)/` |
| Admin por email | `BAZZAR_ADMIN_EMAILS` |
| Checkout único server action | Sin `api/checkout` legacy |
| Rollback stock | RPC `liberar_stock_reserva` (SQL) |
| CSP + headers | `next.config.mjs` |
| Service role solo server | `lib/supabase/admin.ts` |

### ⏳ Acción Director / DevOps

- [ ] Confirmar rotación password DB Supabase (post-fuga git)
- [ ] Ejecutar `supabase/migrations_etapa_001.sql` en producción
- [ ] Ejecutar `supabase/v_stock_web.sql` en producción
- [ ] Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `BAZZAR_ADMIN_EMAILS`, `ADMIN_WHATSAPP`
- [ ] Smoke: pedido con token; `/pedido/1` sin token → bloqueado

### ⚠️ Riesgos residuales (aceptados fase 1)

- Rate-limit in-memory (no Redis) — suficiente lanzamiento inicial; escalar con Upstash si hay abuso.
- CSP `unsafe-inline` — requerido por Next.js 14.
- Pago online **no** integrado — coordinación manual WhatsApp hasta Bancard.

---

## 2. NIIF — verificación visual

**Marco:** NIIF institucional RIMEC (`niif_estandar_visual.md`) aplica a módulos Report/Retail institucional. **Bazzar-web** es canal B2C con **marca propia** (Navy `#1E3A5F`, Orange `#F97316`), no Report.

### Reglas aplicadas en Bazzar

| Regla NIIF | Bazzar | Acción |
|------------|--------|--------|
| Prohibido `yellow-*` | Admin + confirmación pedido | ✅ Reemplazado por `amber-*` |
| Prohibido `bg-white/XX` en UI institucional | Header, admin | ✅ Sólidos donde aplica |
| `text-white/XX` en headers oscuros | Pedido confirmación | ✅ Opacidad vía slate claro |
| Azul RIMEC `#002B4E` | No aplica storefront | Marca Bazzar navy `#1E3A5F` |
| Ámbar advertencias | Permitido NIIF | Usado en badges PENDIENTE |

### Excepciones documentadas (B2C)

- Overlays `bg-white` sólido en lightbox catálogo (controles sobre foto) — UX e-commerce, no pantalla institucional.
- Announcement bar negro en Header — identidad marca retail.

### Comando verificación local

```powershell
cd bazzar-web
rg "text-yellow|bg-yellow|border-yellow" app/
# Esperado: 0 coincidencias post-corrección
```

---

## 3. Bancard — corredor de pagos

### Estado actual: **PRE-INTEGRACIÓN**

| Componente | Estado |
|------------|--------|
| Documento comercial | `docs/BANCARD_SOLICITUD.md` |
| Config env | `.env.example` — vars BANCARD_* |
| Librería | `lib/payments/bancard.ts` — stub |
| Callback IPN | `app/api/payments/bancard/callback/route.ts` — stub |
| Init pago | `app/api/payments/bancard/init/route.ts` — stub |
| UI checkout | Menciona Bancard; flujo = coordinar post-pedido |

### Flujo lanzamiento fase 1 (sin Bancard)

1. Cliente confirma pedido → stock reservado → token confirmación.
2. Equipo contacta por WhatsApp (`ADMIN_WHATSAPP`).
3. Pago: efectivo / transferencia / acordado manualmente.
4. Admin confirma pedido en Nexus/Supabase.

### Flujo fase 2 (con Bancard — post-credenciales)

1. Tras crear pedido → `POST /api/payments/bancard/init` → redirect VPOS.
2. Bancard → `POST /api/payments/bancard/callback` → actualizar `pedido_web.estado`.
3. Cliente → `/pedido/[id]?t=...&pago=ok`.

### Bloqueadores Bancard

- [ ] Alta comercio e-commerce con Bancard Paraguay
- [ ] Credenciales sandbox en Vercel
- [ ] Certificación sandbox
- [ ] Implementación `createBancardPayment` real (OT post-credenciales)

---

## 4. Criterios de cierre de proyecto

### Go-live mínimo (puede cerrar etapa)

- [x] Código auditado y build verde
- [x] Seguridad etapa 001 en repo
- [x] NIIF admin/confirmación corregido
- [ ] SQL producción ejecutado
- [ ] Deploy www.bazzar.com.py
- [ ] Smoke end-to-end en producción
- [ ] Solicitud Bancard registrada (fecha en BANCARD_SOLICITUD.md)

### Cierre proyecto completo (incluye pagos)

- [ ] Bancard sandbox operativo
- [ ] Pago con tarjeta en checkout
- [ ] Webhook confirmado en producción

---

## 5. Próximo paso al decir «Cerrar Etapa»

1. Aprobación visual Director  
2. Commit consolidado → merge `main`  
3. Push → Vercel → verificar www.bazzar.com.py  
4. Smoke producción  
5. Marcar checkboxes de esta doc  

---

*Auditoría de cierre — Bazzar Web ETAPA-002.*
