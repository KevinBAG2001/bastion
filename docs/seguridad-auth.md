# Guía de Seguridad de Autenticación — Bastion

> Guía para principiantes que explica cada protección implementada en el sistema
> de autenticación de Bastion, qué ataque evita y por qué importa.

## Índice

1. [Hash de contraseñas con Argon2id](#1-hash-de-contraseñas-con-argon2id)
2. [Verificación de contraseñas filtradas (HIBP)](#2-verificación-de-contraseñas-filtradas-hibp)
3. [Límite de intentos de login](#3-límite-de-intentos-de-login)
4. [Sesiones seguras (cookies HttpOnly)](#4-sesiones-seguras-cookies-httponly)
5. [Verificación de correo electrónico](#5-verificación-de-correo-electrónico)
6. [Recuperación de contraseña](#6-recuperación-de-contraseña)
7. [Protección CSRF](#7-protección-csrf)
8. [Encabezados de seguridad y CSP](#8-encabezados-de-seguridad-y-csp)
9. [Bitácora de eventos de seguridad](#9-bitácora-de-eventos-de-seguridad)
10. [Mensajes genéricos y tiempo constante](#10-mensajes-genéricos-y-tiempo-constante)

---

## 1. Hash de contraseñas con Argon2id

**Archivo:** `src/lib/argon2.ts`

**¿Qué es?** Las contraseñas nunca se guardan en texto plano. Se transforman con
una función matemática irreversible llamada "hash". Argon2id es el algoritmo
recomendado por OWASP en 2024.

**¿Qué ataque evita?**
- **Fuerza bruta offline (CWE-916):** Si un atacante roba la base de datos, no
  puede revertir los hashes para obtener las contraseñas. Argon2id usa mucha
  memoria (~19 MiB por hash), lo que hace que los ataques con GPUs y hardware
  especializado (ASICs) sean extremadamente lentos y costosos.

**¿Por qué Argon2id y no bcrypt?**
- bcrypt fue diseñado en 1999 y es vulnerable a ataques con FPGAs.
- Argon2id ganó la Password Hashing Competition en 2015 y es resistente a
  ataques de canal lateral y con hardware paralelo.
- Usamos `hash-wasm` (WebAssembly puro) para no depender de compilación nativa.

**Parámetros:**
- `iterations: 2` — costo de tiempo.
- `memorySize: 19456` KiB (~19 MiB) — costo de memoria.
- `parallelism: 1` — adecuado para Node.js single-threaded.
- `hashLength: 32` — 256 bits de salida.
- Salt aleatorio de 16 bytes por contraseña.

**Compatibilidad:** Los hashes bcrypt existentes (prefijo `$2a$` o `$2b$`)
siguen funcionando. Se migran progresivamente a Argon2id.

---

## 2. Verificación de contraseñas filtradas (HIBP)

**Archivo:** `src/lib/hibp.ts`

**¿Qué es?** Antes de aceptar una contraseña, verificamos si aparece en
filtraciones de datos conocidas usando la API de Have I Been Pwned.

**¿Qué ataque evita?**
- **Credential stuffing (CWE-521, CWE-307):** Los atacantes compran o descargan
  listas de contraseñas filtradas y las prueban en miles de sitios. Si tu
  contraseña está en una lista, un atacante puede entrar a tu cuenta.

**¿Cómo funciona la privacidad (k-anonymity)?**
1. Se calcula el SHA-1 de la contraseña **en el servidor** (no se envía la contraseña).
2. Se envían solo los **primeros 5 caracteres** del hash a HIBP.
3. HIBP devuelve todos los sufijos que coinciden (~500 resultados).
4. Se busca **localmente** si el sufijo completo aparece.

**Tu contraseña nunca sale del servidor.** HIBP solo ve un prefijo ambiguo.

**Tolerancia a fallos:** Si HIBP no responde (red caída), el registro se permite
con una advertencia en la bitácora. La seguridad no bloquea la funcionalidad.

---

## 3. Límite de intentos de login

**Archivo:** `src/lib/limite-intentos.ts`

**¿Qué es?** Después de varios intentos fallidos, la cuenta o la IP se bloquean
temporalmente con tiempos progresivos.

**¿Qué ataque evita?**
- **Fuerza bruta online (CWE-307):** Un atacante intenta miles de contraseñas.
- **Credential stuffing masivo (CWE-799):** Prueba listas de credenciales desde una IP.

**Escala progresiva:**
| Intentos fallidos | Bloqueo temporal |
|:-:|:-:|
| 1–4 | Sin bloqueo |
| 5–9 | 1 minuto |
| 10–14 | 5 minutos |
| 15–19 | 15 minutos |
| 20+ | 60 minutos |

**¿Por qué PostgreSQL y no Redis?** Bastion es un monolito de aprendizaje con
una sola instancia. PostgreSQL ya está disponible y los intentos se consultan
con un índice optimizado. Si se escala a múltiples instancias, migrar a Redis.

---

## 4. Sesiones seguras (cookies HttpOnly)

**Archivo:** `src/auth.ts`

**¿Qué es?** La sesión del usuario se almacena en un JWT firmado dentro de una
cookie con atributos de seguridad estrictos.

**¿Qué ataque evita?**
- **Robo de sesión por XSS (CWE-79):** `HttpOnly` impide que JavaScript acceda a la cookie.
- **Envío accidental a otros sitios (CWE-352):** `SameSite=Lax` restringe el envío.
- **Interceptación en tránsito (CWE-319):** `Secure` (en producción) fuerza HTTPS.

**Invalidación de sesiones:**
- Al cambiar la contraseña, se incrementa `sessionVersion` en la base de datos.
- Cada JWT contiene el `sessionVersion` del momento del login.
- En el próximo refresco, si la versión no coincide, la sesión se invalida.
- Esto permite "cerrar sesión en todos los dispositivos".

---

## 5. Verificación de correo electrónico

**Archivos:** `src/lib/tokens.ts`, `src/lib/correo.ts`, `src/app/api/auth/verificar-correo/route.ts`

**¿Qué es?** Después del registro, se envía un token de un solo uso al correo.
El usuario debe hacer clic en el enlace para activar su cuenta.

**¿Qué ataque evita?**
- **Registro con correos ajenos (CWE-345):** Sin verificación, alguien podría
  registrarse con tu correo y recibir notificaciones en tu nombre.
- **Abuso de la plataforma:** Cuentas falsas con correos inventados.

**Seguridad del token:**
- 32 bytes criptográficamente aleatorios (256 bits de entropía).
- Se guarda solo el **hash SHA-256** en la base de datos.
- Caduca en 24 horas.
- Un solo uso: se marca como "usado" inmediatamente.

**Adaptador de correo:** En desarrollo, los correos se imprimen en la consola
del servidor. En producción, cambiar por Resend, SES u otro servicio.

---

## 6. Recuperación de contraseña

**Archivos:** `src/app/api/auth/recuperar-contrasena/route.ts`, `src/app/api/auth/restablecer-contrasena/route.ts`

**¿Qué es?** Si olvidaste tu contraseña, puedes solicitar un enlace de
recuperación que caduca en 30 minutos.

**¿Qué ataque evita?**
- **Enumeración de correos (CWE-203):** El mensaje es siempre el mismo, exista
  o no el correo. Un atacante no puede saber si un correo está registrado.
- **Reutilización de tokens (CWE-613):** Token de un solo uso con caducidad corta.
- **Persistencia de sesiones (CWE-613):** Al cambiar la contraseña, todas las
  sesiones JWT se invalidan.

---

## 7. Protección CSRF

**Archivo:** `src/lib/csrf.ts`

**¿Qué es?** Cross-Site Request Forgery es cuando un sitio malicioso hace que
tu navegador envíe solicitudes a Bastion sin tu consentimiento.

**¿Qué ataque evita?**
- **CSRF (CWE-352):** Un formulario en `evil.com` podría cambiar tu contraseña
  o inscribirte en cursos sin que lo sepas.

**¿Cómo funciona?**
- Los Route Handlers verifican que el encabezado `Origin` coincida con el host.
- Las Server Actions de Next.js tienen protección CSRF automática.
- Auth.js gestiona su propio token CSRF para `/api/auth/*`.

---

## 8. Encabezados de seguridad y CSP

**Archivo:** `src/middleware.ts`

**¿Qué es?** Encabezados HTTP que instruyen al navegador sobre cómo manejar el
contenido de forma segura.

| Encabezado | ¿Qué evita? |
|:--|:--|
| `Content-Security-Policy` | Scripts maliciosos inyectados (XSS, CWE-79) |
| `X-Content-Type-Options: nosniff` | MIME sniffing (CWE-430) |
| `X-Frame-Options: DENY` | Clickjacking (CWE-1021) |
| `Referrer-Policy` | Fuga de URLs en encabezados Referer (CWE-200) |
| `Permissions-Policy` | Acceso no autorizado a cámara, micrófono, etc. |
| `Strict-Transport-Security` | Downgrade a HTTP (CWE-319) |

**CSP con nonce:** Se genera un nonce criptográfico aleatorio en cada solicitud.
Solo los scripts con ese nonce pueden ejecutarse, bloqueando scripts inyectados.

---

## 9. Bitácora de eventos de seguridad

**Archivo:** `src/lib/bitacora-seguridad.ts`

**¿Qué es?** Registro persistente en PostgreSQL de todos los eventos de
seguridad: registros, logins, fallos, bloqueos, cambios de contraseña, etc.

**¿Qué ataque evita?**
- **Registro insuficiente (CWE-778):** Sin logs, un atacante puede operar sin
  ser detectado. La bitácora permite investigación forense.

**Reglas de privacidad:**
- NUNCA se registran contraseñas, hashes, tokens ni cookies.
- Los correos se redactan parcialmente: `kevin@gmail.com` → `k***@g***.c***`.
- Se registra la acción, el resultado y la IP (para correlacionar ataques).

---

## 10. Mensajes genéricos y tiempo constante

**¿Qué ataque evita?**
- **Enumeración de usuarios (CWE-203):** Si el mensaje de error dice "correo no
  registrado", un atacante puede descubrir qué correos existen.
- **Timing attacks (CWE-208):** Si la respuesta es más rápida cuando el usuario
  no existe (porque no se verifica la contraseña), un atacante puede medir
  tiempos para enumerar cuentas.

**¿Cómo lo resolvemos?**
- El mensaje de error de login siempre dice "Correo o contraseña incorrectos."
- En registro y recuperación, siempre dice "Si el correo es válido, recibirás..."
- Cuando el usuario no existe, se ejecuta un hash Argon2id dummy para igualar
  el tiempo de respuesta.

---

## Diagrama de flujo de autenticación

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Registro │────▶│ Argon2id │────▶│  HIBP    │────▶│  Token   │
│          │     │  hash    │     │ k-anon   │     │ verific. │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
                                                        │
                                                        ▼
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login  │────▶│ Rate     │────▶│ Argon2id │────▶│  JWT +   │
│         │     │ Limit DB │     │ verify   │     │  Cookie  │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
                                                        │
                                                        ▼
┌─────────┐     ┌──────────┐                     ┌──────────┐
│ Cambio  │────▶│ session  │────────────────────▶│ Invalidar│
│ password│     │ Version  │                     │ JWT      │
└─────────┘     │ +1       │                     │ en todos │
                └──────────┘                     └──────────┘
```

---

## Requisitos de contraseña

| Criterio | Valor |
|:--|:--|
| Longitud mínima | 10 caracteres |
| Longitud máxima | 128 caracteres |
| Debe contener | Al menos 1 letra, 1 número y 1 carácter especial |
| No debe aparecer en | Filtraciones conocidas (HIBP) |

---

## Archivos clave

| Archivo | Responsabilidad |
|:--|:--|
| `src/lib/argon2.ts` | Hash y verificación Argon2id |
| `src/lib/hibp.ts` | Verificación HIBP k-anonymity |
| `src/lib/limite-intentos.ts` | Rate limiting en PostgreSQL |
| `src/lib/tokens.ts` | Tokens seguros de un solo uso |
| `src/lib/correo.ts` | Adaptador de correo (consola) |
| `src/lib/bitacora-seguridad.ts` | Bitácora de eventos |
| `src/lib/csrf.ts` | Protección CSRF para Route Handlers |
| `src/lib/validations.ts` | Esquemas zod de validación |
| `src/auth.ts` | Configuración Auth.js con Argon2id |
| `src/middleware.ts` | Encabezados de seguridad y CSP |
| `src/actions/auth.ts` | Server Action de login |
| `src/app/api/auth/register/route.ts` | Registro con todas las protecciones |
| `src/app/api/auth/verificar-correo/route.ts` | Verificación de correo |
| `src/app/api/auth/recuperar-contrasena/route.ts` | Solicitar recuperación |
| `src/app/api/auth/restablecer-contrasena/route.ts` | Restablecer contraseña |
| `src/app/api/auth/cerrar-todas-sesiones/route.ts` | Cerrar todas las sesiones |
| `prisma/schema.prisma` | Modelos de BD (TokenVerificacion, IntentoLogin, EventoSeguridad) |

---

## Riesgos pendientes (fuera de este PR)

1. **2FA (segundo factor):** Irá en otro PR.
2. **Adaptador de correo real:** Hoy se imprime en consola; en producción usar Resend/SES.
3. **Rate limiting distribuido:** Si se escala a múltiples instancias, migrar a Redis/Upstash.
4. **Limpieza de intentos antiguos:** Implementar cron para `limpiarIntentosAntiguos()`.
5. **CAPTCHA:** No implementado; agregar como evolución con alternativa accesible.
6. **Migración progresiva de bcrypt a Argon2id:** Los hashes legados se re-hashean al login.
