# Guía de Despliegue — Bazzar Web en Vercel

**Proyecto:** Bazzar Web  
**Framework:** Next.js 15  
**Repo GitHub:** https://github.com/segoviaranonis-dev/bazzar-web.git

---

## **Pre-requisitos**

1. ✅ Cuenta Vercel (vercel.com) con acceso a GitHub
2. ✅ Repo `segoviaranonis-dev/bazzar-web` pusheado a GitHub
3. ✅ Credenciales Supabase listas
4. ✅ API key de Resend para emails
5. ✅ WhatsApp del admin

---

## **Paso 1: Conectar Repositorio en Vercel**

### **1.1 Crear Nuevo Proyecto**
1. Ir a https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. En "Import Git Repository":
   - Buscar: `segoviaranonis-dev/bazzar-web`
   - Click **"Import"**

### **1.2 Configurar Proyecto**

**Project Name:**
```
bazzar-web
```

**Framework Preset:**
```
Next.js
```
(Vercel lo detecta automáticamente)

**Root Directory:**
```
./
```
(dejar vacío = raíz del repo)

**Build and Output Settings:**
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

**NO modificar** — Next.js usa configuración estándar.

---

## **Paso 2: Variables de Entorno**

En **Environment Variables** de Vercel, agregar:

### **Obligatorias (Supabase)**

| Variable | Valor | Entorno |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://TU_REF.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key de Supabase | **Solo Production** (nunca Preview) |

**Dónde obtener valores:**
1. Ir a tu proyecto Supabase → **Settings** → **API**
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (🔒 secreto)

### **Obligatorias (Resend — Emails)**

| Variable | Valor | Entorno |
|----------|-------|---------|
| `RESEND_API_KEY` | `re_XXXXXX` (de resend.com) | Production |
| `ADMIN_EMAIL` | `admin@bazzar.com.py` | Production |

**Dónde obtener:**
- Resend: https://resend.com/api-keys

### **Obligatorias (WhatsApp)**

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `ADMIN_WHATSAPP` | Número sin + ni espacios | `595981000000` |

---

## **Paso 3: Deploy**

1. Click **"Deploy"**
2. Esperar build (~2-3 min)
3. Si falla, revisar logs en **"Build Logs"**

---

## **Paso 4: Verificación Post-Deploy**

### **4.1 URL del Proyecto**
```
https://bazzar-web.vercel.app
```
(o el dominio asignado por Vercel)

### **4.2 Checklist Funcional**

| Ruta | Qué verificar | ✓ |
|------|---------------|---|
| `/` | Página principal carga | ☐ |
| `/catalogo` | Lista de productos desde Supabase | ☐ |
| `/catalogo/[id]` | Detalle producto con imagen | ☐ |
| `/catalogo?search=zapato` | Búsqueda funciona | ☐ |
| Imagen producto | Storage Supabase carga (no 404) | ☐ |
| Carrito (si aplica) | Agregar producto funciona | ☐ |
| API `/api/pedidos` | Crear pedido (test) | ☐ |

### **4.3 Validación Técnica**

**Console del navegador (F12):**
- ❌ NO debe haber errores de CORS
- ❌ NO debe haber errores de Supabase auth
- ✅ Imágenes desde `https://TU_REF.supabase.co/storage/...`

**Network tab:**
- Requests a Supabase: status 200
- Requests a `/api/*`: status 200

---

## **Paso 5: Dominio Personalizado (Opcional)**

Si querés usar `bazzar.nexus.com.py`:

1. Vercel → **Settings** → **Domains**
2. Agregar: `bazzar.nexus.com.py`
3. Vercel te da records DNS (CNAME o A)
4. Configurar en tu proveedor DNS
5. Esperar propagación (5-10 min)

---

## **Troubleshooting**

### **Error: "Invalid Supabase URL"**
- Verificar que `NEXT_PUBLIC_SUPABASE_URL` esté bien copiada (sin espacios)
- Ejemplo correcto: `https://abcdefgh.supabase.co`

### **Error: "Failed to fetch products"**
- Verificar RLS (Row Level Security) en Supabase
- Tabla `productos` debe tener policy de SELECT público
- O tener auth configurado si requiere login

### **Imágenes 404**
- Verificar que bucket `productos` en Supabase Storage sea **público**
- Settings → Storage → `productos` → Make public

### **Build falla con error TypeScript**
- Correr localmente: `npm run build`
- Arreglar errores de tipos
- Push y redeploy

---

## **Mantenimiento**

### **Actualizar Deploy**
Cualquier push a branch `main` en GitHub → auto-deploy en Vercel.

### **Preview Deployments**
Cualquier PR → Vercel genera preview URL automático.

### **Rollback**
Vercel → **Deployments** → Click deploy anterior → **"Promote to Production"**

---

## **Contacto de Emergencia**

**Errores críticos post-deploy:**
1. Rollback a deploy anterior
2. Revisar logs: Vercel → Functions → Logs
3. Verificar variables de entorno no cambiaron

**Supabase down:**
- Status: https://status.supabase.com

**Vercel down:**
- Status: https://www.vercel-status.com

---

**Última actualización:** 2026-05-31  
**Responsable técnico:** MARTA2
