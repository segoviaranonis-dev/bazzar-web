# ETAPA ABIERTA — Bazzar Web · Publicación MVP

**Estado:** 🚧 **ACTIVA**  
**Inicio:** 2026-06-10  
**Objetivo:** Publicar **www.bazzar.com.py** con catálogo, carrito, checkout y admin — **sin Bancard** (fase 2 aparte).  
**Repo:** https://github.com/segoviaranonis-dev/bazzar-web.git  
**Holding:** `.claude/4_etapas/ETAPA_BAZZAR_WEB_PUBLICACION.md`

---

## Regla de esta etapa

1. **Primero:** publicar y validar el sitio en producción (MVP WhatsApp).  
2. **Después:** etapa separada «Sistema de pago Bancard» — no mezclar ni bloquear el go-live.

---

## Qué incluye el MVP (sí)

- Catálogo público con stock y precios  
- Carrito + checkout  
- Pedido con token `?t=` (seguridad)  
- Admin pedidos (`/admin`)  
- Confirmación vía **WhatsApp / email manual**

## Qué NO incluye (etapa futura)

- Cobro con tarjeta Bancard  
- Certificación comercial Bancard  
- Términos legales finales (recomendado antes de marketing masivo, no bloquea smoke técnico)

---

## Lista paso a paso — recomendación Cursor

### Paso 1 — Supabase producción (Director · ~30 min)

1. Entrar a Supabase → proyecto producción RIMEC/Bazzar.  
2. SQL Editor → ejecutar **en este orden** (si no están aplicados):
   - `supabase/migrations_bazzar.sql`
   - `supabase/migrations_etapa_001.sql`
   - `supabase/v_stock_web.sql`
3. Verificar catálogo:
   ```sql
   SELECT COUNT(*) FROM v_stock_web WHERE stock_web > 0;
   ```
   → debe ser **> 0**
4. Verificar precios (crítico — sin precio no hay checkout):
   ```sql
   SELECT COUNT(*) FROM v_stock_web WHERE precio_web IS NOT NULL AND precio_web > 0;
   ```
   → debe ser **> 0**. Si da 0: cargar lista precios WEB antes de seguir.
5. Confirmar que rotaste claves si hubo exposición (`service_role`, DB password).

**Listo cuando:** queries OK + stock/precios visibles en SQL.

---

### Paso 2 — Vercel proyecto (Director · ~1 h)

1. https://vercel.com/dashboard → **Add Project** → importar `segoviaranonis-dev/bazzar-web`.  
2. Framework: **Next.js** (auto). Root: `./`. Build: `npm run build`.  
3. Variables **Production** (Settings → Environment Variables):

| Variable | Obligatoria |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (solo server) |
| `ADMIN_WHATSAPP` | Sí (sin +, ej. `595981XXXXXX`) |
| `ADMIN_EMAIL` | Sí |
| `BAZZAR_ADMIN_EMAILS` | Sí (emails admin, coma) |

Detalle: `docs/DEPLOY_VERCEL_BAZZAR.md`

4. **No** configurar variables Bancard aún (etapa pago futura).

**Listo cuando:** primer deploy Vercel verde (aunque sea URL `*.vercel.app`).

---

### Paso 3 — Dominio www.bazzar.com.py (Director · ~1 h + DNS)

1. Vercel → Project → **Domains** → agregar:
   - `www.bazzar.com.py`
   - `bazzar.com.py` (redirect a www)
2. Panel **Max Dominio** (registrador): CNAME + A según Vercel.  
   Guía: `docs/SUBETAPA_MAX_DOMINIO.md`
3. Esperar propagación DNS (hasta 24–48 h).  
4. Mientras tanto: smoke en URL temporal `https://bazzar-web-xxx.vercel.app`.

**Listo cuando:** `https://www.bazzar.com.py/inicio` responde 200.

---

### Paso 4 — Publicar código (Director → agente)

1. Revisión rápida local (opcional): `npm run build` en `bazzar-web/`.  
2. Decir al agente: **«Cerrar Etapa Bazzar publicación»** o **«push main bazzar-web»**.  
3. Agente: commit consolidado → `git push origin main`.  
4. Vercel redeploy automático.  
5. Anotar commit SHA en evidencia de cierre.

**Listo cuando:** deploy Production = Ready en Vercel.

---

### Paso 5 — Smoke producción (Director o tienda · ~30 min)

Probar en **www** (o URL Vercel si DNS pendiente):

| # | Acción | OK si… |
|---|--------|--------|
| 1 | Abrir `/inicio` y `/catalogo` | Productos con foto y precio |
| 2 | Agregar talla al carrito | Suma correctamente |
| 3 | Ir a `/checkout` | Formulario completo |
| 4 | Confirmar pedido | Redirige a `/pedido/ID?t=TOKEN` |
| 5 | Abrir `/pedido/ID` **sin** `?t=` | No muestra datos sensibles |
| 6 | Botón WhatsApp | Número admin correcto |
| 7 | `/admin/login` | Solo email autorizado entra |
| 8 | Admin | Aparece el pedido de prueba |

Si falla **precio no disponible** → volver al Paso 1 (precios en Supabase).

**Listo cuando:** los 8 ítems PASS.

---

### Paso 6 — Go-live operativo (Director · día 3–5)

1. Avisar a ventas: flujo = pedido web → WhatsApp confirma pago y entrega.  
2. Un pedido real interno (cliente de prueba).  
3. Revisar pedido en admin.  
4. (Recomendado) Publicar URLs reales de Términos / Privacidad (hoy pueden ir a `#`).

**Listo cuando:** pedido real procesado manualmente sin sorpresas.

---

### Paso 7 — Cerrar esta etapa (Director)

1. Confirmar: «MVP Bazzar publicado».  
2. Agente documenta evidencia `docs/evidencia/ETAPA_PUBLICACION_CIERRE.json`.  
3. Actualizar `.claude/4_etapas/ETAPA_BAZZAR_WEB_PUBLICACION_CERRADA.md`.  
4. **Shibboleth cierre:** commit en git + deploy verificado + PC local `git pull`.

---

## Fase posterior — NO abrir hasta Paso 7 cerrado

### Etapa futura: Sistema de pago Bancard

| Orden | Acción |
|-------|--------|
| 1 | Trámite comercial Bancard + RUC → `docs/BANCARD_SOLICITUD.md` |
| 2 | Credenciales sandbox |
| 3 | Integración `lib/payments/bancard.ts` + callback |
| 4 | Certificación + variables Vercel Bancard |
| 5 | Smoke pago tarjeta en producción |

**Doc:** `docs/BANCARD_SOLICITUD.md` · **Tiempo típico:** 2–6 semanas comerciales.

---

## Roles

| Quién | Qué |
|-------|-----|
| **Director** | SQL Supabase, Vercel, DNS, smoke, contacto Bancard (fase 2) |
| **Cursor / Claude** | Código, commit, deploy, integración Bancard cuando toque |
| **Tienda** | Probar flujo, atender WhatsApp |

---

## Documentos relacionados

| Doc | Uso |
|-----|-----|
| [PLAN_ENTREGA_BAZZAR_WEB.md](./PLAN_ENTREGA_BAZZAR_WEB.md) | Plan ampliado + calendario |
| [DEPLOY_VERCEL_BAZZAR.md](./DEPLOY_VERCEL_BAZZAR.md) | Variables Vercel |
| [SUBETAPA_MAX_DOMINIO.md](./SUBETAPA_MAX_DOMINIO.md) | DNS Max Dominio |
| [ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md](./ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md) | Auditoría seguridad |
| [BANCARD_SOLICITUD.md](./BANCARD_SOLICITUD.md) | Solo fase pago |

---

## Próxima acción (ahora)

**Paso 1** — Ejecutar SQL en Supabase y verificar `precio_web > 0`.

Cuando termines Paso 1, decí **«Paso 2 Bazzar»** y seguimos Vercel.

**Shibboleth:** 5 patas ✅
