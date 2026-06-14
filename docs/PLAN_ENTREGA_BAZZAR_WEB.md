# Plan de entrega — Bazzar Web

**Objetivo:** Poner **www.bazzar.com.py** en producción lo antes posible, con pedidos web operativos.  
**Repo:** https://github.com/segoviaranonis-dev/bazzar-web.git  
**Fecha plan:** 2026-06-10

---

## Qué significa «entregar el proyecto»

Hay **dos niveles**. No mezclarlos para no retrasar el lanzamiento.

| Nivel | Qué incluye | ¿Bloquea go-live? |
|-------|-------------|-------------------|
| **Entrega Mínima (MVP)** | Sitio público + catálogo + carrito + checkout + confirmación con token + admin pedidos + pago manual (WhatsApp) | **No** — esto es el lanzamiento |
| **Entrega Completa** | Todo lo anterior + **Bancard** (tarjeta en línea) + cierre formal de proyecto | **Sí** — depende de Bancard (semanas comerciales) |

**Recomendación:** Entregar **MVP en 3–5 días hábiles** y Bancard en una **fase 2** en paralelo comercial.

---

## Estado hoy (resumen)

| Listo | Pendiente |
|-------|-----------|
| Código auditado, build OK | SQL en Supabase producción |
| Seguridad etapa 001–002 | Deploy Vercel + dominio DNS |
| NIIF admin corregido | Smoke en producción |
| Stubs Bancard cableados | Alta comercial Bancard + credenciales |
| Docs deploy / Bancard | Commit + push a `main` (Cerrar Etapa) |

---

## Ruta crítica (lo que frena el lanzamiento)

Solo **4 bloques** en orden. Todo lo demás es paralelo o post-lanzamiento.

```
[1] Supabase SQL  →  [2] Vercel + dominio  →  [3] Smoke real  →  [4] Cerrar Etapa (git + deploy)
         ↑                      ↑
    Director              Director / quien tenga acceso DNS
    ~30 min               ~1–2 h (+ propagación DNS 24–48 h)
```

**Bancard no está en la ruta crítica del MVP.**

---

## Fase 0 — Hoy (30 min) — Director

Checklist único; marcar al terminar:

- [ ] Password Supabase rotada (ya iniciado)
- [ ] Supabase → SQL Editor → ejecutar en orden:
  1. `supabase/migrations_bazzar.sql` (si nunca se corrió)
  2. `supabase/migrations_etapa_001.sql`
  3. `supabase/v_stock_web.sql`
- [ ] Verificar catálogo: en SQL Editor  
  `SELECT COUNT(*) FROM v_stock_web WHERE stock_web > 0;`  
  Debe devolver filas > 0
- [ ] Verificar precios:  
  `SELECT COUNT(*) FROM v_stock_web WHERE precio_web IS NOT NULL AND precio_web > 0;`  
  Si da **0**, hay que cargar lista precios WEB en Supabase antes del lanzamiento (sin precio, checkout rechaza el pedido)

---

## Fase 1 — Deploy (día 1–2) — Director + agente

### 1.1 Vercel (1 h)

- [ ] Proyecto conectado al repo `segoviaranonis-dev/bazzar-web`
- [ ] Variables de entorno **Production**:

| Variable | Dónde sacarla |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem (service_role, nueva si rotaste) |
| `ADMIN_WHATSAPP` | Número real sin + (ej. `595981XXXXXX`) |
| `ADMIN_EMAIL` | Email operativo |
| `BAZZAR_ADMIN_EMAILS` | Emails que entran a `/admin` |

Detalle: `docs/DEPLOY_VERCEL_BAZZAR.md`

### 1.2 Dominio (1 h + espera DNS)

- [ ] Vercel → Domains → `www.bazzar.com.py` + `bazzar.com.py`
- [ ] Registrador DNS según Vercel (CNAME www, A en apex)
- [ ] Redirect apex → www

### 1.3 Código en producción

- [ ] Director aprueba visual local (opcional: `npm run dev`)
- [ ] Decir **«Cerrar Etapa»** → commit consolidado → push `main` → Vercel redeploy

---

## Fase 2 — Smoke producción (día 2–3) — Director o tienda

Probar en **www.bazzar.com.py** con un pedido de prueba:

| # | Prueba | OK si… |
|---|--------|--------|
| 1 | `/inicio` y `/catalogo` | Carga productos con fotos |
| 2 | Agregar al carrito | Talla suma al pedido |
| 3 | `/checkout` | Formulario completo |
| 4 | Confirmar pedido | Redirige a `/pedido/ID?t=TOKEN` |
| 5 | Sin `?t=` | No muestra datos del pedido |
| 6 | WhatsApp | Abre chat con número correcto |
| 7 | `/admin/login` | Entra solo email autorizado |
| 8 | Admin | Lista el pedido de prueba |

Si falla **precio no disponible**: falta `precio_web` en vista → revisar lista precios WEB en Supabase.

---

## Fase 3 — Operación go-live (día 3–5)

- [ ] Comunicar a ventas: flujo = pedido web → WhatsApp confirma pago y entrega
- [ ] Pedido real de prueba con cliente interno
- [ ] Revisar pedido en admin y en Nexus (si aplica)
- [ ] Términos / Privacidad: hoy los links van a `#` — reemplazar URLs reales o PDF (no bloquea MVP técnico, sí legal/comercial)

**Entrega MVP = Fase 0 + 1 + 2 + 3 completas.**

---

## Fase 4 — Bancard (paralelo, +2 a 6 semanas)

No esperar esto para abrir la tienda.

| Semana | Acción | Responsable |
|--------|--------|-------------|
| 1 | Contacto comercial Bancard + documentos RUC | Director |
| 1–2 | Registrar caso en `docs/BANCARD_SOLICITUD.md` | Director |
| 2–4 | Credenciales sandbox | Bancard |
| 4–5 | Integración real (`lib/payments/bancard.ts` + callback) | Agente dev |
| 5–6 | Certificación + producción | Bancard + Director |

Hasta entonces: checkout ya dice «coordinamos al confirmar» — coherente con operación manual.

---

## Roles (quién hace qué)

| Rol | Tareas |
|-----|--------|
| **Director (Héctor)** | SQL Supabase, Vercel vars, DNS, aprobación visual, contacto Bancard, smoke final |
| **Cursor / Claude Code** | Código, commit, deploy tras «Cerrar Etapa», integración Bancard fase 2 |
| **Operación / tienda** | Probar flujo real, responder WhatsApp, confirmar pedidos |
| **Bancard** | Alta comercio, credenciales, certificación |

---

## Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Sin `precio_web` en BD | Checkout falla | Verificar query Fase 0; cargar lista WEB |
| DNS lento | Dominio no resuelve 24–48 h | Usar URL Vercel temporal para smoke mientras tanto |
| Bancard demora | Sin tarjeta online | MVP con WhatsApp — ya previsto |
| Stock desactualizado | Pedido rechazado | Normal; mensaje al cliente es claro |
| Rotación claves incompleta | Seguridad | Confirmar service_role + DB password en Vercel y `.env.local` |

---

## Calendario sugerido (agresivo)

| Día | Hito |
|-----|------|
| **D0** | SQL Supabase + vars Vercel + WhatsApp real |
| **D1** | Push main, deploy, dominio configurado |
| **D2** | DNS activo + smoke completo |
| **D3** | Go-live comunicado + pedido real interno |
| **D5** | MVP cerrado — «Cerrar Etapa» documentada |
| **S+2–6** | Bancard sandbox → producción (fase 2) |

---

## Definición de «proyecto entregado»

### MVP entregado ✅

- www.bazzar.com.py operativo
- Pedido web end-to-end con token de seguridad
- Admin funcional
- Pago manual documentado
- Docs: README, DEPLOY, ETAPA-002, este plan

### Proyecto 100% cerrado ✅

- Todo lo anterior
- Bancard cobrando en producción
- Términos y privacidad publicados
- Handoff operación (quién atiende pedidos WhatsApp)

---

## Documentos de referencia

| Doc | Uso |
|-----|-----|
| [PLAN_ENTREGA_BAZZAR_WEB.md](PLAN_ENTREGA_BAZZAR_WEB.md) | Este plan |
| [ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md](ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md) | Auditoría cierre |
| [DEPLOY_VERCEL_BAZZAR.md](DEPLOY_VERCEL_BAZZAR.md) | Paso a paso Vercel |
| [BANCARD_SOLICITUD.md](BANCARD_SOLICITUD.md) | Trámite pagos fase 2 |
| [AUDITORIA_BAZZAR_WEB.md](AUDITORIA_BAZZAR_WEB.md) | Histórico irregularidades |

---

## Próxima acción concreta (ahora)

1. Terminar **Fase 0** (SQL en Supabase + query de precios).  
2. Si precios OK → **Fase 1** Vercel + dominio.  
3. Decir **«Cerrar Etapa»** cuando quieras subir a producción.

*Plan de entrega — Bazzar Web — entrega rápida MVP primero, Bancard después.*
