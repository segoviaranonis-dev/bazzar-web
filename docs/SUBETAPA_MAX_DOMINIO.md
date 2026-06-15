# SUBETAPA — MAX DOMINIO (registrador bazzar.com.py)

**Inicio:** 2026-06-10  
**Estado:** EN CURSO  
**Padre:** [PLAN_ENTREGA_BAZZAR_WEB.md](./PLAN_ENTREGA_BAZZAR_WEB.md) · Fase 1.2 Dominio  
**Proveedor:** [MaxDominios.com](https://www.maxdominios.com) · Titular: RIMEC S.A.C.I (Sergio Ohiggins)

---

## Qué son esos dos mails de marzo

Max Dominio te vendió **dos cosas distintas** en un paquete típico:

| Mail | Qué confirma | Vencimiento |
|------|--------------|-------------|
| **1 — Registro dominio** | `bazzar.com.py` registrado 1 año | **27/03/2027** · 169.000 Gs |
| **2 — Activación hosting** | Plan **Master 5000 MB** (cPanel + FTP + correo) | **27/03/2027** · 1.267.200 Gs/año |

No es Bancard. No es Supabase. Es **dominio .py + hosting clásico PHP/cPanel** en servidores Max Dominio.

---

## Lo importante: tu tienda NO va por cPanel/FTP

**bazzar-web** es Next.js en **Vercel** + datos en **Supabase**. Eso **no se publica** subiendo archivos por FileZilla al hosting Max Dominio.

| Servicio Max Dominio | ¿Lo usamos para la tienda? |
|----------------------|----------------------------|
| cPanel / FTP / “publicar sitio” | **No** — es para PHP/HTML estático en su servidor |
| DNS del dominio | **Sí** — hay que apuntar el dominio a **Vercel** |
| Correo `nombre@bazzar.com.py` | **Opcional** — admin@, ventas@ vía cPanel/webmail |

Si dejás los DNS `ns1021.maxdominios.com` / `ns1022.maxdominios.com` **sin cambiar registros**, www mostrará el hosting vacío de Max Dominio (cPanel), **no** tu catálogo Next.js.

---

## DNS que trae el mail

Max Dominio asignó nameservers propios:

- **Primario:** `ns1021.maxdominios.com`
- **Secundario:** `ns1022.maxdominios.com`

Eso significa: el DNS lo controlan **ellos** (mientras el dominio use esos NS). Para Vercel tenés **dos caminos**:

### Opción A — Recomendada (web en Vercel, correo en Max)

1. Entrar al **Área de Clientes** Max Dominio o cPanel → **Editor de zona DNS**.
2. Crear registros que pida **Vercel** al agregar el dominio (típico):
   - `www` → CNAME → `cname.vercel-dns.com`
   - `@` (apex) → A → IP que indique Vercel (ej. `76.76.21.21`)
3. **No tocar** registros MX si más adelante usás `mail.bazzar.com.py` para correo.
4. Esperar propagación 24–48 h.

### Opción B — Responder a Max Dominio

El mail de registro dice: *“si va a apuntar a otro servidor, responder con los DNS del servidor”*. Podés pedirles que dejen el dominio apuntando a Vercel si no tenés acceso al editor DNS.

### Opción C — NO usar para la tienda

Publicar por FTP en `ftp.bazzar.com.py` → **solo** si abandonás Vercel y servís HTML estático (no aplica a este proyecto).

---

## Credenciales (NO en git)

El mail incluye usuario cPanel/FTP. **Guardar solo en gestor de contraseñas**, no en el repo.

| Recurso | URL / dato (público) |
|---------|----------------------|
| cPanel | `http://www.bazzar.com.py/cpanel` |
| Webmail | `http://www.bazzar.com.py/webmail` |
| FTP host | `ftp.bazzar.com.py` |
| Usuario panel | `bazzarcompy` *(contraseña: rotar si se filtró)* |
| Correo POP/SMTP | `mail.bazzar.com.py` · POP 995 SSL · SMTP 465 SSL |

Archivo local: [max-dominio/README.md](./max-dominio/README.md)

---

## ¿Subo la página ya o espero Bancard?

**Subí la página ya.** Max Dominio solo resuelve **dominio + DNS**; Bancard es **otro trámite** (semanas).

| Paso | Acción | Bloquea go-live |
|------|--------|-----------------|
| 1 | DNS → Vercel | Sí, hasta propagar |
| 2 | SQL Stock Sano en Supabase prod | Sí, sin precio no hay checkout |
| 3 | Deploy Vercel (ya en `main`) | — |
| 4 | Pedidos con **WhatsApp** (MVP) | Listo en código |
| 5 | Trámite **Bancard** | No — fase 2 tarjeta |

Hosting Max Dominio **ya está pagado hasta 2027** — podés usarlo para **correo corporativo** aunque la web viva en Vercel.

---

## Checklist sub-etapa MAX DOMINIO

- [ ] Rotar contraseña cPanel/FTP (filtrada en chat)
- [ ] Vercel → agregar `www.bazzar.com.py` + `bazzar.com.py`
- [ ] DNS en Max Dominio: CNAME/A hacia Vercel (no FTP)
- [ ] Redirect apex → www en Vercel
- [ ] HTTPS OK · smoke `/catalogo`
- [ ] (Opcional) Crear `admin@bazzar.com.py` en cPanel
- [ ] (Paralelo) Enviar [BANCARD_SOLICITUD.md](./BANCARD_SOLICITUD.md)

---

## Referencias

- [ESTADO_BAZZAR_WEB_2026.md](./ESTADO_BAZZAR_WEB_2026.md)
- [DEPLOY_VERCEL_BAZZAR.md](./DEPLOY_VERCEL_BAZZAR.md)
- Soporte Max: +595 21 729 4040 · responder al mail de activación
