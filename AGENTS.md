# Agent memory - Bazzar Web

## Rol del repo

`bazzar-web` es el e-commerce publico del holding.
Es la unica app abierta al publico.

## Leyes de trabajo

- GitHub es la verdad central; la PC de Hector es taller; Vercel es vidriera.
- Catalogo publico puede ser abierto.
- Admin, stock, precio, checkout y APIs sensibles no son libres.
- No confiar en el navegador para precio, stock, cantidades ni `combinacion_id`.
- `SUPABASE_SERVICE_ROLE_KEY` solo servidor. Nunca exponerlo al cliente.
- El checkout debe validar precio y stock server-side.
- Stock no se actualiza directo: usar RPC/funciones atomicas ya definidas.
- Imagenes de producto: usar el protocolo Nexus `linea-referencia-material-color.jpg` con codigos proveedor/F9, nunca IDs internos.

## Prioridad actual

Bazzar Web no es prioridad funcional ahora.
No tocar salvo:
- bug critico de produccion
- fuga de secretos
- stock/precio vulnerable
- admin expuesto

Antes de tocar codigo:
1. `git status`
2. leer `CONTEXT.md`
3. revisar `middleware.ts`
4. revisar flujo checkout antes de tocar stock

Validacion minima:
- `npm run build`
- probar catalogo publico si toca UI publica
- probar que admin siga protegido si toca seguridad
