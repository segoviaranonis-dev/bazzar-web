# RIMEC NEXUS — Estado al 2026-03-31

## Repositorios

| Repo | Estado | Descripción |
|---|---|---|
| `segoviaranonis-dev/ventas_por_mes_rimec` | ✅ Activo, privado | NEXUS ERP (Streamlit) |
| `segoviaranonis-dev/bazzar-web` | ✅ Creado, privado | Bazzar E-commerce (Next.js) |

---

## Módulos ERP Activos

| # | Módulo | Estado |
|---|---|---|
| 1 | `home` | ✅ Activo |
| 2 | `sales_report` | ✅ Activo — arteria principal |
| 3 | `import_data` | 🟡 Declarado, UI pendiente |
| 4 | `system_status` | 🟡 Declarado, UI pendiente |

---

## Bazzar Web — Estado FASE 1

```
app/(public)/catalogo/  ✅ Server Component desde v_catalogo_web
app/admin/              ✅ Dashboard pedidos + login Supabase Auth
app/api/checkout/       ✅ reservar_stock() + pedido_web
middleware.ts           ✅ Protección /admin/*
lib/supabase/           ✅ client.ts + server.ts SSR
types/bazzar.ts         ✅ Tipos del dominio
```

**Pendiente para FASE 2:** CSV maestro → catálogo real con productos y stock.

---

## Supabase — Estado BD

### Tablas ERP (17 tablas _v2) ✅
### Tablas E-commerce (17 tablas sin sufijo) ✅
### Vistas ✅
- `v_ventas_pivot` — pivot ventas 2025/2026
- `v_stock_actual` — stock por combinación
- `v_catalogo_web` — catálogo público con precio y stock

### Función atómica ✅
- `reservar_stock()` — first-click-wins, transacción SERIALIZABLE

### Datos iniciales ✅
- Almacén `ALM_WEB_01` (TIENDA)
- Lista de precios `MINORISTA_WEB` (WEB, PYG)

---

## Próximos pasos inmediatos

1. **CSV maestro** → importar catálogo real (proveedor, líneas, referencias, tallas, colores)
2. **FASE 2** → ficha de producto, filtros, diseño mobile
3. **FASE 3** → carrito + checkout simulado
4. **FASE 5** → deploy Vercel + RLS + demo director

---

## Reglas de Oro para Nuevas Sesiones

1. Leer `docs/NEXUS_MISION.md` y `docs/NEXUS_ARQUITECTURA.md` antes de proponer código
2. Verificar contratos logic→ui→export antes de cambios en esas capas
3. No tocar `core/` sin razón arquitectural
4. Las tablas `_v2` son el ERP. Las sin sufijo son e-commerce. No hay otras.
5. `v_ventas_pivot` es el origen de todos los datos de ventas
6. Stock siempre via `reservar_stock()` — nunca SQL directo
7. ∞ no es 100% — respetar honestidad matemática
8. Todo en español — código, comentarios, mensajes
9. Objetivo: PHP muerto en 24 meses
