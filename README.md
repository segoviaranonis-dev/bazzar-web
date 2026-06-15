# Bazzar Web

Tienda web de calzado — Next.js 14 · Supabase · Vercel.

**Dominio:** [www.bazzar.com.py](https://www.bazzar.com.py)

## Desarrollo local

```bash
cp .env.example .env.local   # completar claves
npm install
npm run dev:3002              # puerto 3002 (Report usa 3000)
```

Tras activar Stock Sano en Report, aplicar vista catálogo:

```bash
npm run db:v-stock-web
```

## Documentación de etapa

- **[ETAPA ABIERTA — Publicación MVP](docs/ETAPA_ABIERTA_PUBLICACION.md)** — **▶ LISTA PASO A PASO (Director)**
- [Plan de entrega (MVP rápido)](docs/PLAN_ENTREGA_BAZZAR_WEB.md)
- [Deploy Vercel](docs/DEPLOY_VERCEL_BAZZAR.md)
- [SUBETAPA MAX DOMINIO](docs/SUBETAPA_MAX_DOMINIO.md) — DNS registrador
- [ETAPA BAZZAR-WEB-003 — Stock Sano](docs/ETAPA_BAZZAR_WEB_003_STOCK_SANO.md) — **CERRADA**
- [ETAPA BAZZAR-WEB-002 — Lanzamiento](docs/ETAPA_BAZZAR_WEB_002_LANZAMIENTO.md)
- [Solicitud Bancard](docs/BANCARD_SOLICITUD.md) — **fase 2, después del MVP**

## SQL Supabase (ejecutar en orden)

1. `control_central/migrations/115_stock_sano_protocolo.sql`
2. Backfill Report: `report/scripts/aplicar_stock_sano.mjs`
3. `supabase/migrations_bazzar.sql`
4. `supabase/migrations_etapa_001.sql`
5. `supabase/v_stock_web.sql` — o `npm run db:v-stock-web`

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo server-side.
- Confirmación de pedido requiere token: `/pedido/[id]?t=...`
- Rotar credenciales DB si estuvieron expuestas en git.
