# Deploy bazzar-web → www.bazzar.com.py (Vercel)

## Prerrequisitos

- Repo conectado a Vercel (proyecto `bazzar-web`).
- Supabase producción con SQL de etapa ejecutado.
- Dominio **bazzar.com.py** administrado (DNS).

---

## 1. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Scope | Notas |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **Solo server** — nunca `NEXT_PUBLIC_` |
| `ADMIN_WHATSAPP` | Production | Sin + ni espacios, ej. `595981000000` |
| `ADMIN_EMAIL` | Production | Notificaciones |
| `BAZZAR_ADMIN_EMAILS` | Production | Emails admin separados por coma |

Opcional (Bancard, cuando existan credenciales):

- `BANCARD_PUBLIC_KEY`, `BANCARD_PRIVATE_KEY`, `BANCARD_COMMERCE_CODE`, `BANCARD_ENV`

---

## 2. Dominio custom

1. Vercel → Project → **Settings → Domains**
2. Agregar `www.bazzar.com.py` y `bazzar.com.py`
3. Configurar DNS en el registrador:

| Tipo | Nombre | Valor |
|------|--------|-------|
| CNAME | www | `cname.vercel-dns.com` |
| A | @ | `76.76.21.21` (o valor que indique Vercel) |

4. Redirigir apex → www (recomendado): en Vercel, redirect `bazzar.com.py` → `www.bazzar.com.py`

---

## 3. Deploy

```bash
npm run build   # verificar local
git push origin main   # solo al Cerrar Etapa
```

Vercel auto-deploy en push a `main`.

---

## 4. Smoke post-deploy

1. `https://www.bazzar.com.py/inicio` carga.
2. Catálogo muestra productos con stock.
3. Checkout crea pedido → URL con `?t=` token.
4. Sin token, `/pedido/1` no expone datos.
5. `/admin/login` accesible; dashboard tras auth.
6. WhatsApp links usan `ADMIN_WHATSAPP`.

---

## 5. Seguridad post-deploy

- Rotar `SUPABASE_SERVICE_ROLE_KEY` si alguna credencial estuvo en git.
- Confirmar RLS en tablas sensibles (`cliente_web`, `pedido_web`).
- Revisar CSP en respuesta HTTP (Vercel + middleware).
