# Catálogo Bazzar Web — grilla, caja abierta, fotos y protocolos

**Actualizado:** 2026-07-16 · **Dev local:** `npm run dev:3002` → http://localhost:3002/catalogo

---

## 1. Modelo de venta — caja abierta (no negociable)

| Concepto | Implementación |
|----------|----------------|
| **Unidad vendible** | `combinacion_id` = L+R+Material+Color+**Talla** |
| **Grilla tienda** | Agrupa por triplete L+R+Material → variantes color → **botones de talla** |
| **Stock mostrado** | `stock_web` por talla (pares sueltos, no bulto cerrado) |
| **Carrito** | Una línea por talla elegida (`ProductoCard.handleAddTalla`) |
| **Checkout** | Valida `precio_web`, `stock_web` y `stock_sano_estado = SANO` por `combinacion_id` |

La tienda **no** vende curva cerrada 34–39. Eso es importadora (Report/Retail). Bazzar = **gradas abiertas** por combinación.

---

## 2. Cadena de datos (depósito → catálogo → venta)

```
INGRESO_COMPRA (ALM_WEB_01)
  → traspaso CONFIRMADO + traspaso_detalle
  → Stock Sano (triplete L+R+Material → precio WEB)
  → v_stock_web (386 filas · 745 pares · jul-2026)
  → soloVendibleCatalogo() en tienda
  → checkout (rechaza SIN_PROTOCOLO)
```

### Protocolos obligatorios

| Protocolo | Dónde | Regla |
|-----------|-------|-------|
| **Stock Sano** | `stock_sano_deposito` + `stock_sano_almacen` | Triplete con LPN, caso, `precio_venta` |
| **Precio WEB** | `precio` + `lista_precio` tipo WEB | Vigente (`fecha_hasta IS NULL`) |
| **PE sin id_pp** | Report `lpn-caso-sql.ts` | LPN/caso desde FI→PPD (`precio_lpn`, `descp_caso_snapshot`) |
| **Confirmar recepción** | `compra-web/mutations.ts` | Tras ingreso → `aplicarStockSanoAlmacen` automático |
| **Checkout blindaje** | `app/actions/checkout.ts` | Bloquea `SIN_PROTOCOLO` y precio ≤ 0 |

Backfill histórico: `node report/scripts/aplicar_stock_sano.mjs --skip-migracion`

---

## 3. Grilla catálogo (código)

| Archivo | Rol |
|---------|-----|
| `supabase/v_stock_web.sql` | Vista única catálogo + Stock Sano + FK imagen |
| `lib/catalogo-vendible.ts` | Filtro **SANO + precio > 0 + stock > 0** |
| `app/(public)/catalogo/page.tsx` | Query + agrupación L+R+Material |
| `app/(public)/catalogo/ProductoCard.tsx` | Tarjeta, lightbox, tallas clicables |
| `lib/filtros.ts` | Marcas/estilos solo sobre stock vendible |
| `app/api/search/route.ts` | Búsqueda solo vendible |

Aplicar vista tras cambios SQL: `npm run db:v-stock-web`

---

## 4. Fotos — protocolo NIIF (2026-07-16)

### Componente único

| Archivo | Rol |
|---------|-----|
| `components/ProductImage.tsx` | Marco `cadena-thumb-frame` / `cadena-hero-frame` · **object-contain** |
| `lib/productImageProtocol.ts` | Rama **654** (L-R-M-C) vs **638** Kyly (L_color) |
| `lib/product-image.ts` | Tiers **sm/md/lg** + cadena retry |

### Reglas (LEY integridad visual)

- Grilla usa **sm/** primero — nunca escalar flat a hero
- Cambio de **color** → nueva cadena de imagen (FK `ppd_color_codigo` + `proveedor_importacion_id`)
- Kyly (638): stem `linea_color.jpg` · calzado (654): `linea-ref-mat-color.jpg`
- CSS: `app/globals.css` · marco con `overflow:hidden` + contain

### Grillas / gradas (caja abierta)

- Tallas deduplicadas por `combinacion_id` · orden `talla_orden` numérico
- Solo tallas con `stock > 0` en tarjeta
- Swatch color remonta `ProductImage` con `key={color_id}` → foto alineada al color

---

## 5. Estado verificado local (2026-07-16)

| Métrica | Valor |
|---------|-------|
| SKUs vendibles | 386 |
| Pares | 745 |
| Modelos (L+R+Mat) | 77 |
| `stock_sano_estado = SANO` | 100% |
| `precio_web > 0` | 100% |
| Dev server | `:3002` |

---

## 6. Operación Report (espejo)

| Módulo Report | Ruta |
|---------------|------|
| Depósito Web | `/bazzar-web/deposito-web` |
| Compra Web | `/bazzar-web/compra` |
| Stock Sano | `/bazzar-web/stock-sano` |
| Motor precio | `/bazzar-web/motor-precio` |

Doc Report: `report/docs/bazzar-web/INDICE.md`

---

## 7. Pendientes conocidos

- [ ] Subir fotos faltantes al bucket `productos` (HEAD audit masivo)
- [ ] Marca «—» en PE Kyly: enriquecer `marca_id` en pilares línea
- [ ] Producción: reaplicar `v_stock_web.sql` + backfill Stock Sano en Supabase prod
- [ ] Integración Bancard (etapa aparte — no bloquea catálogo)

---

## 8. Comandos rápidos

```bash
cd bazzar-web
npm run dev:3002          # tienda local
npm run db:v-stock-web    # aplicar vista
node scripts/audit_vendible_fk.mjs
```

**Integración Moria:** requiere keyword **Documenta** del Director para `.claude/`.
