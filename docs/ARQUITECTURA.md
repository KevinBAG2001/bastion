# Arquitectura de Bastion

Bastion es una plataforma educativa de ciberseguridad orientada a principiantes de habla hispana. Este documento describe la arquitectura técnica, flujos principales y decisiones de diseño.

## Visión general

```mermaid
flowchart TB
  subgraph cliente [Cliente]
    Browser[Navegador Next.js App Router]
  end
  subgraph app [Aplicación]
    UI[Páginas y componentes React]
    Actions[Server Actions]
    API[Rutas API]
    Auth[Auth.js sesiones JWT]
  end
  subgraph datos [Datos]
    PG[(PostgreSQL)]
    Prisma[Prisma ORM]
  end
  Browser --> UI
  UI --> Actions
  UI --> API
  Actions --> Prisma
  API --> Prisma
  Auth --> Prisma
  Prisma --> PG
```

## Stack tecnológico

| Capa | Tecnología | Rol |
|------|------------|-----|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 | UI responsive, modo oscuro, accesibilidad básica |
| Backend | Server Actions + Route Handlers | Mutaciones y APIs mínimas (registro, Auth.js) |
| Autenticación | Auth.js (NextAuth v5) credenciales | Argon2id, verificación de correo, HIBP, rate limit en PostgreSQL, JWT con `sessionVersion` |
| Validación | Zod | Entrada de registro, login y envío de cuestionarios |
| Datos | PostgreSQL + Prisma | Cursos, progreso, intentos de quiz, logros |
| Pruebas | Vitest (unidad), Playwright (e2e) | Gamificación, calificación de quizzes, flujo crítico |

## Modelo de dominio

- **User**: credenciales (hash Argon2id), verificación de correo, XP y nivel calculado.
- **Course / Lesson / Quiz**: contenido pedagógico; cada curso tiene lecciones ordenadas y un cuestionario final.
- **Enrollment / LessonProgress / QuizAttempt**: progreso persistente por usuario.
- **Achievement / UserAchievement**: gamificación y bonificaciones de XP.

Los cursos se organizan por dificultad (`PRINCIPIANTE`, `INTERMEDIO`, `AVANZADO`).

## Autenticación y seguridad

Guía detallada: [docs/seguridad-auth.md](seguridad-auth.md).

1. **Registro** (`POST /api/auth/register`): Zod, Argon2id, comprobación HIBP (k-anonymity), token de verificación por correo, límite por IP en PostgreSQL.
2. **Verificación** (`GET /api/auth/verificar-correo`): token de un solo uso (hash SHA-256 en BD).
3. **Inicio de sesión**: Server Action con límite progresivo por correo/IP y Auth.js credentials.
4. **Recuperación**: UI en `/recuperar-contrasena` y `/restablecer-contrasena`; APIs con mensajes genéricos anti-enumeración; invalidación de sesiones al cambiar contraseña.
5. **Sesión**: JWT en cookie HttpOnly; `sessionVersion` invalida tokens en todos los dispositivos.
6. **Rutas protegidas**: middleware (Edge) con `auth.config.ts` sobre `/panel`, `/cursos`, `/perfil`.
7. **Cuestionarios**: calificación en servidor (`gradeQuiz`); respuestas correctas no expuestas antes del envío.

Variables sensibles solo en `.env` (plantilla en `.env.example`).

## Gamificación

- Fórmula de nivel: XP necesaria para nivel `n` = `(n - 1)² × 100`.
- XP por lección completada, quiz aprobado (≥ 70 %) y curso terminado.
- Logros desbloqueables (primera lección, primer quiz, curso completo, nivel 5, tres inscripciones).

## Flujos de usuario

1. **Landing** pública → registro / login.
2. **Catálogo** → detalle de curso → inscripción.
3. **Lección** → marcar completada → XP.
4. **Quiz** → envío → retroalimentación y XP si aprueba.
5. **Panel y perfil** → progreso, logros e historial.

## Despliegue local

- `docker-compose.yml` levanta PostgreSQL 16.
- Migraciones Prisma y `pnpm db:seed` cargan contenido real en español.
- La app escucha en el puerto 3000 por defecto.

## CI/CD

GitHub Actions ejecuta lint, typecheck, pruebas unitarias, build y e2e con servicio Postgres. Dependabot apunta actualizaciones a la rama `dev`.

## Extensiones futuras (fuera de alcance inicial)

- OAuth social y segundo factor (2FA).
- Adaptador de correo real (Resend, SES) en producción.
- Panel de administración de contenido.
- Rate limiting distribuido (Redis / Upstash).
- Internacionalización adicional más allá del español LATAM.
