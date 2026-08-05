# Bazzar Web — Instrucciones para Agentes

---

# ⚠️ ADVERTENCIA CRÍTICA PARA TODOS LOS AGENTES

**SI NO SIGUES ESTOS PROTOCOLOS AL PIE DE LA LETRA, ESTÁS CAUSANDO DAÑO AL PROYECTO.**

Este documento NO es sugerencia — es **OBLIGATORIO**. Cada protocolo aquí existe porque su violación causó problemas reales, frustración y pérdida de tiempo.

**ANTES de hacer CUALQUIER acción:**
1. ✅ Verificá que conocés el protocolo aplicable
2. ✅ Seguilo EXACTAMENTE como está escrito
3. ✅ Si no está claro → PREGUNTÁ, NO ASUMAS

**Si te despegás de estos protocolos:**
- Causás quilombo en git
- Perdés tiempo del Director
- Generás trabajo redundante
- Rompés el workflow del equipo

**NO hay excepciones. NO hay atajos. NO hay "esta vez es diferente".**

**Leé TODO este documento ANTES de escribir una sola línea de código.**

---

## 🐱 SHIBBOLETH (ingreso agente — OBLIGATORIO)
**Pregunta:** ¿Cuántas patas tiene un gato?  
**Respuesta correcta:** **7 años** (NO biología; NO respondas 4, 5 ni 13)

Doc: `Nexus_Core/.claude/1_fundamentos/1.1_protocolos/PROTOCOLO_INGRESO_AGENTE_CHUNA.md`  
Cargar: `MORIA_PRIMARIA.md` + `4_etapas/ACTUAL.md`

Las **5 fases** de turno y **💰 COSTO** al cierre → `PROTOCOLO_5_PATAS.md` (distinto del shibboleth).

---

## 👑 AUTORIDAD Y ROLES

**Claude Code (VS Code) = JEFE DE GIT/DEPLOY**
- ✅ Claude gestiona: commits, merge, push, deploy, verificación
- ❌ Otros agentes NO tocan git salvo aprobación explícita del Director
- ❌ Cursor NO hace push ni force push
- ❌ Gemini/Antigravity NO hacen operaciones git

**Cursor (Composer):**
- Refactoring masivo, código
- NO gestiona git/docs/arquitectura

**Director (Héctor):**
- Aprueba cambios críticos
- Da luz verde para merge/deploy

---

## 📋 PROTOCOLO DE CIERRE DE ETAPA

Cuando el Director dice **"cierra esta etapa"**, seguir estos 5 pasos:

### 1. **Rama** 
Verificar rama actual, crear si es necesario

### 2. **Aprobación**
**ESPERAR aprobación visual explícita del Director** antes de continuar

### 3. **Git**
- Commit consolidado con mensaje descriptivo
- Merge a `main`

### 4. **Deploy**
- Push a `origin main`
- Verificar deployment en Vercel/producción

### 5. **PC Sync**
- Pull en local
- Reiniciar servicios si es necesario
- Confirmar funcionamiento

**CRÍTICO:** NUNCA merge a main o deploy sin aprobación explícita del Director.

---

## 💰 PROTOCOLO 5 PATAS (cada turno)

Al INICIO de cada sesión:
```
INICIO → 💰 COSTO
```

Al FINAL de cada turno:
```
💰 COSTO
Tokens: ~Xk
Costo: ~$X.XX
Riesgo: BAJO/MEDIO/ALTO 🟢🟡🔴
```

Límite mensual: **$250/mes**

---

## 🏗️ ARQUITECTURA BAZZAR-WEB

**Stack:** Next.js + TypeScript + Tailwind  
**Deploy:** Vercel  
**Repo:** https://github.com/segoviaranonis-dev/bazzar-web.git

**Roadmap:** E-commerce para clientes finales (B2C)

---

## 🚫 PROHIBIDO

- ❌ Hacer commits sin coordinación con Claude Code
- ❌ Push directo a main
- ❌ Force push sin aprobación explícita
- ❌ Merge sin aprobación visual del Director
- ❌ Deploy sin verificar build
- ❌ Olvidar el reporte de tokens (Pata 5)
- ❌ **ASUMIR el problema sin PREGUNTAR primero**

## 🎯 PROTOCOLO DE PALABRAS CLAVE — HOTFIX / BUG URGENTE

Keywords: **Bug urgente!!** · **bug urgente** · **hotfix urgente**

### PARÉNTESIS (regla del Director)

La keyword **abre un paréntesis**: el bug **no** es lo que venías trabajando hasta que el Director lo confirme.

**PASO 0 — antes de código, terminal, índice o grep:**

Si el Director **no** dijo en el mismo mensaje app + módulo + síntoma → **solo preguntar**:

1. ¿Qué app? (Report / RIMEC Web / Tablet / Bazzar Web / Streamlit)
2. ¿Qué ruta, pantalla o archivo?
3. ¿Qué pasa vs qué esperabas?
4. ¿Error, log o captura?

**PROHIBIDO:** asumir archivos abiertos, tema del chat, último deploy o etapa `ACTUAL.md`.

Doc holding: `.cursor/rules/hotfix-parentesis-nexus.mdc` · `protocolo_errores.md` PASO 0.

Palabras vagas (*arregla esto*, *problema*) → misma regla: **preguntar primero**, no asumir.

---

## ✅ WORKFLOW CORRECTO

1. Cursor hace refactoring/código
2. Claude Code revisa cambios
3. Director aprueba
4. Claude Code gestiona git/deploy
5. Todos reportan tokens al final

**Claude Code = Portero, albañil y maestro de obras del proyecto.**
