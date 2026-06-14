# ETAPA BAZZAR-WEB-003 — Catálogo con protocolo Stock Sano

**Inicio:** 2026-06-10  
**Cierre:** 2026-06-10  
**Estado:** CERRADA  
**Predecesora:** [ETAPA-002](./ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md)  
**Report:** [04_STOCK_SANO.md](../../report/docs/bazzar-web/04_STOCK_SANO.md)

---

## Objetivo

Tienda pública **www.bazzar.com.py** consume precios canonizados por **Stock Sano** (ALM_WEB_01): precio de venta por triplete L+R+Material vía `fn_precio_venta_web(LPN, caso)`.

## Cadena

```
Report Stock Sano → stock_sano_deposito + lista WEB
        ↓
v_stock_web (precio_web + stock_sano_estado)
        ↓
Catálogo / Carrito / Checkout (precio servidor)
```

## Entregables

| Entregable | Ubicación |
|------------|-----------|
| Migración tablas protocolo | `control_central/migrations/115_stock_sano_protocolo.sql` |
| Backfill ALM_WEB_01 | `report/scripts/aplicar_stock_sano.mjs` |
| Vista catálogo | `supabase/v_stock_web.sql` |
| Script aplicar vista | `scripts/apply_v_stock_web.mjs` → `npm run db:v-stock-web` |
| Checkout guard | `app/actions/checkout.ts` |
| Panel Report | `/bazzar-web/stock-sano` |

## Verificación de cierre (dev)

| Check | Resultado |
|-------|-----------|
| `v_stock_web` SKUs | 22 |
| Pares | 60 |
| `precio_web` > 0 | 22/22 |
| `stock_sano_estado = SANO` | 22/22 |
| Catálogo HTTP | 200 — http://localhost:3002/catalogo |
| Dev server | `npm run dev:3002` |

```sql
SELECT stock_sano_estado, COUNT(*)::int, SUM(stock_web)::int
FROM v_stock_web GROUP BY 1;
-- SANO · 22 · 60
```

## SQL producción (orden)

1. `115_stock_sano_protocolo.sql`
2. `report/scripts/aplicar_stock_sano.mjs`
3. `npm run db:v-stock-web` (repo bazzar-web)

## Pendiente post-cierre

- Interceptar **Confirmar recepción** (Compra) — conflicto de precio + decisión Director
- Segundo depósito bajo protocolo
