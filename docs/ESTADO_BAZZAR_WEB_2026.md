# Estado Bazzar Web — snapshot 2026-06-10

Consolidado hasta cierre **ETAPA-003 Stock Sano** y publicación git.

---

## Productos

| Capa | Qué | Repo / URL |
|------|-----|------------|
| **Tienda** | Catálogo, carrito, checkout, admin pedidos | `bazzar-web` → www.bazzar.com.py |
| **Operación** | Compra, depósito, motor precio, Stock Sano | Report `/bazzar-web/*` |
| **BD** | Supabase Postgres (única verdad stock + precios) | Mismo proyecto RIMEC/Nexus |

---

## Stock tienda (pregunta frecuente)

| Rol | Objeto |
|-----|--------|
| **Lo que lee bazzar-web** | Vista `v_stock_web` → columna `stock_web` |
| **Verdad operativa (pares)** | `movimiento` + `movimiento_detalle` (ALM_WEB_01 id=1) |
| **Precio venta** | `precio` + `lista_precio` WEB; canon **Stock Sano** en `stock_sano_deposito` |

Dev verificado **2026-07-16:** **745 pares**, **386 combinaciones**, **77 modelos**, todas `stock_sano_estado = SANO`, `precio_web > 0`.

Doc grilla + protocolos: [CHUSAR_CATALOGO_GRILLA_VENTA_ABIERTA.md](./CHUSAR_CATALOGO_GRILLA_VENTA_ABIERTA.md)

---

## Etapas cerradas

| Etapa | Estado | Doc |
|-------|--------|-----|
| 001 — Seguridad + Bancard prep | Código entregado | [ETAPA_BAZZAR_WEB_001.md](./ETAPA_BAZZAR_WEB_001.md) |
| 002 — Lanzamiento | Código entregado | [ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md](./ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md) |
| 003 — Stock Sano | **CERRADA** | [ETAPA_BAZZAR_WEB_003_STOCK_SANO.md](./ETAPA_BAZZAR_WEB_003_STOCK_SANO.md) |
| Report ETAPA-004 | **CERRADA** | [report/docs/bazzar-web/ETAPA_STOCK_SANO_004_CIERRE.md](../../report/docs/bazzar-web/ETAPA_STOCK_SANO_004_CIERRE.md) |

---

## Git publicado (2026-06-10)

| Repo | Commit | Contenido clave |
|------|--------|-----------------|
| bazzar-web | `c078111` | Stock Sano vista, checkout, docs |
| report | `d9323d0` | Panel BAZZAR WEB completo |
| control_central | `e063fbf` | Migración `115_stock_sano_protocolo.sql` |

---

## Pendiente go-live producción

1. SQL Supabase **producción** (115 + backfill + `npm run db:v-stock-web`)
2. Vercel env vars + dominio DNS → **[SUBETAPA MAX DOMINIO](./SUBETAPA_MAX_DOMINIO.md)**
3. Smoke pedido real (WhatsApp)
4. Bancard alta comercial (fase 2, no bloquea MVP)

---

## Índice documentación tienda

- [Catálogo grilla + caja abierta + fotos FK](./CHUSAR_CATALOGO_GRILLA_VENTA_ABIERTA.md) ← **2026-07-16**
- [Plan entrega](./PLAN_ENTREGA_BAZZAR_WEB.md)
- [Deploy Vercel](./DEPLOY_VERCEL_BAZZAR.md)
- [Bancard solicitud](./BANCARD_SOLICITUD.md)
- [Max Dominio (sub-etapa)](./SUBETAPA_MAX_DOMINIO.md)
