# NEXUS CORE — Arquitectura Técnica
> Referencia permanente. Actualizar cuando cambie la arquitectura.

## El Imperio (dos sistemas, una BD)

```
NEXUS ERP (Streamlit)          BAZZAR WEB (Next.js)
─────────────────────          ──────────────────────
Análisis de ventas             Catálogo público
Gestión interna                Checkout + pedidos
Importadora + tiendas          Panel admin /admin
Solo usuarios internos         Clientes + admin web
         │                              │
         └──────── Supabase ────────────┘
                  (fuente única de verdad)
```

**Regla de escritura:** Next.js `/admin` es dueño exclusivo de ALM_WEB_01.
NEXUS Streamlit solo lee ALM_WEB_01 (reportería). Sin conflicto de escritura.

---

## Stack NEXUS ERP (Streamlit)

| Capa | Tecnología |
|---|---|
| UI | Streamlit + st-aggrid Enterprise |
| Lógica | Python 3.11+ |
| BD | Supabase (PostgreSQL) |
| PDF | ReportLab |
| Conexión BD | SQLAlchemy + psycopg2 |

## Stack Bazzar Web (Next.js)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14+ App Router + TypeScript + Tailwind |
| Auth admin | Supabase Auth + Middleware Next.js |
| BD | Supabase (mismo proyecto) |
| Email | Resend |
| WhatsApp | wa.me deep link (fase 1 / simulación) |
| Pagos | Bancard API (fase 2) |
| Deploy | Vercel → www.bazzar.com.py |
| Imágenes | Supabase Storage |

---

## Estructura Bazzar Web

```
bazzar-web/
├── app/
│   ├── (public)/catalogo/   ← catálogo público (Server Component)
│   ├── admin/               ← panel admin protegido
│   │   └── login/           ← login Supabase Auth
│   └── api/checkout/        ← POST reservar_stock + crear pedido
├── lib/supabase/
│   ├── client.ts            ← browser client
│   └── server.ts            ← server client (SSR cookies)
├── types/bazzar.ts          ← tipos del dominio
├── middleware.ts            ← protege /admin/*
└── docs/                   ← este directorio
```

---

## Base de Datos Supabase

**Project ref:** `extrlcvcgypwazxipvqm`
**MCP:** `.mcp.json` (en .gitignore — nunca al repo)

### Tablas ERP (_v2)
```
cadena_v2, categoria_v2, cliente_v2, cliente_cadena_v2,
comision_v2, grupo_v2, grupo_estilo_v2, listado_de_precio_v2,
marca_v2, plazo_v2, producto_v2, proveedor_v2,
registro_ventas_general_v2, tipo_v2, usuario_v2,
vendedor_v2, vendedor_marca_v2
```

### Tablas E-commerce (sin sufijo)
```
proveedor_web, linea, referencia, material, color, talla,
almacen, combinacion, lista_precio, precio, imagen_extra,
gradacion_plantilla, gradacion_plantilla_detalle,
movimiento, movimiento_detalle,
pedido_web, pedido_web_detalle
```

### Vistas
```
v_ventas_pivot       — pivot 2025/2026 para módulo ventas ✅
v_stock_actual       — stock por combinacion+almacen ✅
v_catalogo_web       — catálogo público bazzar ✅
v_catalogo_mayorista — catálogo importadora (pendiente)
```

### Función atómica
```
reservar_stock(combinacion_id, cantidad, almacen_id, pedido_id)
→ boolean  — first-click-wins, transacción SERIALIZABLE
```

---

## Los 5 Pilares del Producto

```
(proveedor, línea, referencia, material, color, talla) = combinacion
```
- La combinación se auto-materializa al primer documento que la menciona
- El stock es `SUM(cantidad * signo)` — nunca un campo mutable
- Las imágenes se construyen desde `proveedor.imagen_formula`
  Tokens: `{linea}` `{referencia}` `{material}` `{color}` `{talla}`

---

## Flujo de Pedido (Bazzar Web)

```
Cliente navega v_catalogo_web
    → selecciona tallas → carrito (localStorage)
    → checkout: POST /api/checkout → reservar_stock() (atómica)
        SI stock OK → crea pedido_web PENDIENTE + movimiento VENTA_WEB
                    → retorna wa_link → cliente ve botón WhatsApp
        SI sin stock → HTTP 409 → "se agotó mientras navegabas"
    → Admin en /admin confirma → estado pedido = CONFIRMADO
```

---

## Reglas de Rigor de BD (resumen)
- `movimiento_detalle` APPEND-ONLY — nunca UPDATE/DELETE
- `precio` APPEND-ONLY — nunca UPDATE
- Stock siempre via `reservar_stock()` — nunca SQL directo
- RLS obligatorio antes de deploy público (FASE 5)
- Credenciales solo en `.env.local` — nunca en código ni commits
