# NEXUS CORE — Misión Permanente
> Este archivo no cambia. Es el norte que sobrevive cualquier sprint.

## El Objetivo Final
Absorber completamente el sistema ERP en PHP de una importadora en Paraguay.
Plazo máximo: **24 meses desde 2026-03-01**.
Estrategia: **Ahogamiento (Strangler Fig)** — módulo a módulo, los usuarios
migran solos hasta que el PHP queda sin audiencia y muere.

## El Imperio
- 1 importadora (ventas mayoristas, cajas cerradas, gradaciones)
- 3 tiendas retail (ventas unitarias, e-commerce público)
- Misma BD Supabase. Misma arquitectura. Un solo sistema con dos caras.

## El Operador
**Héctor "Mariscal"** — 42 años. 16 años en la importadora. Dominio absoluto
del negocio. Iniciando Ingeniería Informática. Autodidacta práctico.
- Define el QUÉ y el POR QUÉ. Claude aporta el CÓMO.
- Siempre en español. Acepta verdad, rechaza elogio vacío.
- Vocabulario: Nexus / Piano / DNA / Arteria / Ahogamiento / Mariscal

## Los 5 Pilares del Producto
Todo artículo existe como combinación de:
`(proveedor, línea, referencia, material, color, talla)`
Nunca se crea un artículo manualmente. La combinación se materializa
sola al primer documento que la menciona. El stock es una consulta, no un estado.
Las imágenes se generan desde la fórmula del proveedor: `imagen_formula`
en la tabla proveedor define el patrón de nombre (ej: `{linea}-{color}.jpg`).

## Políticas Inamovibles

**P1 — Seguridad absoluta e innegociable**
Credenciales solo en variables de entorno. RLS en Supabase obligatorio.
SQL siempre parametrizado. Sin secretos en logs. Sin excepciones.
> Si hay duda entre conveniencia y seguridad, gana la seguridad. Siempre.

**P2 — Core agnóstico de módulos**
Ningún archivo de `core/` contiene lógica de ningún módulo.
El core coordina. Los módulos se autoregistran.

**P3 — Fuente única de verdad**
Cada constante existe en UN solo lugar. Colores→`settings.py`.
Calendarios→`constants.py`. Categorías→`categoria_v2`. Sin hardcodear.

**P4 — Matemáticas en la BD, distribución en Python**
Vistas Supabase hacen JOINs y agregaciones pesadas. Python solo aplica
parámetros dinámicos del usuario y construye estructuras de display.

**P5 — Contrato logic → ui es sagrado**
El paquete de `logic.py` tiene estructura exacta. `ui.py` lo consume con
claves exactas. Cambiar uno obliga a cambiar el otro.

**P6 — Módulos autocontenidos**
Cada módulo declara `render_fn`, `sidebar_fn`, `allowed_roles`, `order`.
Registry lo lee. Navigation lo ejecuta. Core no cambia nunca.

**P7 — Filtros son borradores hasta EJECUTAR**
Ningún control de UI dispara SQL por sí solo. Solo `commit_filters()`.

**P8 — Honestidad matemática**
Objetivo=0 con venta real → variación es `∞`, no `100%`.

**P9 — Sin código muerto**
Funciones sin callers se eliminan. Sin excepciones.

**P10 — La BD v2 es la única BD**
Tablas v1 eliminadas el 2026-03-30. Solo existen tablas `_v2` y las nuevas
del modelo de inventario/e-commerce (sin sufijo por ser arquitectura nueva).
